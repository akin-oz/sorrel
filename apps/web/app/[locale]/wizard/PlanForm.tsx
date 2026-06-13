"use client";

import { useEffect, useOptimistic, useTransition } from "react";

import { useMutation, useQuery } from "@apollo/client/react";
import { useTranslations } from "next-intl";

import {
  AppCard,
  AppChip,
  AppSkeleton,
  AppStack,
  AppText,
  AppToggleGroup,
  AppToggleOption,
  sorrelTheme,
} from "@sorrel/ui";

import type { BoxFrequency } from "../../../lib/gql/graphql";
import { FunnelDraftByIdDocument, UpdateFunnelPlanDocument } from "../../../lib/graphql/funnel";
import { useFunnel } from "./FunnelProvider";
import { toBoxFrequency, toPlanInput } from "./draft-input";

const DEFAULT_FREQUENCY: BoxFrequency = "EVERY_4_WEEKS";
const FREQUENCIES: readonly BoxFrequency[] = ["EVERY_2_WEEKS", "EVERY_4_WEEKS"];

/**
 * PLAN step (spec 013) — the optimistic price preview.
 *
 * The frequency toggle drives a React 19 `useOptimistic` value, so the selection
 * flips instantly — before `updateFunnelPlan` resolves — while an "updating" chip
 * marks the price as in-flight. The price itself is always the server's
 * (`@sorrel/domain` is the only thing that computes money); the client never does
 * pricing maths. The recomputed plan flows back through the normalised Apollo
 * cache, so the read query below re-renders with the authoritative figures.
 */
export function PlanForm() {
  const t = useTranslations("Plan");
  const { state, dispatch, draftId } = useFunnel();

  const committedFrequency = toBoxFrequency(state.frequency) ?? DEFAULT_FREQUENCY;
  const [optimisticFrequency, setOptimisticFrequency] = useOptimistic(committedFrequency);
  const [isPending, startTransition] = useTransition();

  const { data } = useQuery(FunnelDraftByIdDocument, {
    variables: { id: draftId ?? "" },
    skip: !draftId,
  });
  const [updatePlan] = useMutation(UpdateFunnelPlanDocument);

  // Land on a default cadence so the page opens with a price (the autosave then
  // persists it and the draft's plan is computed server-side).
  useEffect(() => {
    if (!state.frequency) dispatch({ type: "SET_FREQUENCY", frequency: DEFAULT_FREQUENCY });
  }, [state.frequency, dispatch]);

  const plan = data?.funnelDraft?.plan ?? null;
  const updating = isPending || !plan;

  function choose(_event: React.MouseEvent<HTMLElement>, next: BoxFrequency | null) {
    if (!next || next === committedFrequency) return;
    startTransition(async () => {
      setOptimisticFrequency(next);
      if (draftId) {
        await updatePlan({ variables: { draftId, input: toPlanInput(state, next) } });
      }
      dispatch({ type: "SET_FREQUENCY", frequency: next });
    });
  }

  return (
    <AppStack gap={3}>
      <AppToggleGroup
        value={optimisticFrequency}
        onChange={choose}
        aria-label={t("frequencyLegend")}
      >
        {FREQUENCIES.map((frequency) => (
          <AppToggleOption key={frequency} value={frequency}>
            {t(frequency === "EVERY_2_WEEKS" ? "everyTwoWeeks" : "everyFourWeeks")}
          </AppToggleOption>
        ))}
      </AppToggleGroup>

      <AppCard direction="column" gap={1.5}>
        <AppStack direction="row" alignItems="center" justifyContent="space-between">
          <AppText variant="overline" color={sorrelTheme.mono}>
            {t("summary")}
          </AppText>
          {updating ? <AppChip label={t("updating")} size="small" aria-live="polite" /> : null}
        </AppStack>

        {plan ? (
          <>
            <PriceRow label={t("perBox")} value={plan.pricing.perBox.formatted} />
            <PriceRow label={t("firstBox")} value={plan.pricing.firstBox.formatted} highlight />
            <AppText variant="body2" color="text.secondary">
              {t("portionPerDay", { grams: plan.portionGramsPerDay })} ·{" "}
              {t("mealsPerBox", { meals: plan.mealsPerBox })}
            </AppText>
          </>
        ) : (
          <AppStack gap={1}>
            <AppSkeleton variant="text" height={28} />
            <AppSkeleton variant="text" height={28} width="70%" />
          </AppStack>
        )}
      </AppCard>
    </AppStack>
  );
}

function PriceRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <AppStack direction="row" alignItems="baseline" justifyContent="space-between">
      <AppText variant="body1" fontWeight={highlight ? 600 : 400}>
        {label}
      </AppText>
      <AppText
        variant="body1"
        fontSize="1.25rem"
        fontWeight={700}
        color={highlight ? "primary.main" : "text.primary"}
      >
        {value}
      </AppText>
    </AppStack>
  );
}
