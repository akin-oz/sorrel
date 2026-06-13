"use client";

import { useEffect, useRef, useState } from "react";

import { useMutation } from "@apollo/client/react";

import type { FunnelStep } from "@sorrel/shared";

import type { SaveFunnelDraftMutation } from "../../../lib/gql/graphql";
import { FunnelDraftByIdDocument, SaveFunnelDraftDocument } from "../../../lib/graphql/funnel";
import { toBoxFrequency, toSaveFunnelDraftInput } from "./draft-input";
import type { FunnelState } from "./state";

const DEBOUNCE_MS = 600;

/**
 * Server-backed autosave (spec 013). Debounced on state changes, it fires the
 * `saveFunnelDraft` mutation with an optimistic response (so the draft lands in
 * the cache immediately) and a cache write linking `funnelDraft(id)` to it — the
 * read path a future resume uses. The returned draft id is the handle the PLAN
 * step needs for `updateFunnelPlan`. Failures are swallowed: a flaky endpoint
 * must never break the funnel.
 */
export function useDraftAutosave(state: FunnelState, step: FunnelStep | null): string | null {
  const [save] = useMutation(SaveFunnelDraftDocument);
  const idRef = useRef<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (!step) return;
    // Nothing worth persisting until the funnel has some content.
    if (state.cats.length === 0 && state.recipeSlugs.length === 0 && !state.email) return;

    const handle = setTimeout(() => {
      const id = idRef.current;
      const optimistic = {
        saveFunnelDraft: {
          __typename: "FunnelDraft",
          id: id ?? `optimistic:${step}`,
          step,
          recipeSlugs: state.recipeSlugs,
          deliveryDate: state.deliveryDate,
          frequency: toBoxFrequency(state.frequency),
          email: state.email,
          updatedAt: new Date().toISOString(),
          plan: null,
        },
      } as SaveFunnelDraftMutation;

      void save({
        variables: { input: toSaveFunnelDraftInput(state, step, id) },
        optimisticResponse: optimistic,
        update: (cache, { data }) => {
          const draft = data?.saveFunnelDraft;
          if (!draft?.id) return;
          cache.writeQuery({
            query: FunnelDraftByIdDocument,
            variables: { id: draft.id },
            data: { funnelDraft: draft },
          });
        },
      })
        .then((res) => {
          const savedId = res.data?.saveFunnelDraft.id;
          if (savedId && savedId !== idRef.current) {
            idRef.current = savedId;
            setDraftId(savedId);
          }
        })
        .catch(() => {
          // Offline or endpoint down — autosave is best-effort, never fatal.
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [state, step, save]);

  return draftId;
}
