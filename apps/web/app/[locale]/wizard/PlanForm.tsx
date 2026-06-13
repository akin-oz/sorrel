"use client";

import { useEffect, useOptimistic, useTransition } from "react";

import { useMutation, useQuery } from "@apollo/client/react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

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
    <Stack spacing={3}>
      <ToggleButtonGroup
        exclusive
        color="primary"
        value={optimisticFrequency}
        onChange={choose}
        aria-label={t("frequencyLegend")}
        sx={{ alignSelf: "stretch", "& .MuiToggleButton-root": { flex: 1, py: 1.25 } }}
      >
        {FREQUENCIES.map((frequency) => (
          <ToggleButton key={frequency} value={frequency}>
            {t(frequency === "EVERY_2_WEEKS" ? "everyTwoWeeks" : "everyFourWeeks")}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="overline" sx={{ color: "#A8967F" }}>
            {t("summary")}
          </Typography>
          {updating ? (
            <Chip label={t("updating")} size="small" aria-live="polite" sx={{ fontWeight: 600 }} />
          ) : null}
        </Box>

        {plan ? (
          <>
            <PriceRow label={t("perBox")} value={plan.pricing.perBox.formatted} />
            <PriceRow label={t("firstBox")} value={plan.pricing.firstBox.formatted} highlight />
            <Typography variant="body2" color="text.secondary">
              {t("portionPerDay", { grams: plan.portionGramsPerDay })} ·{" "}
              {t("mealsPerBox", { meals: plan.mealsPerBox })}
            </Typography>
          </>
        ) : (
          <Stack spacing={1}>
            <Skeleton variant="text" height={28} />
            <Skeleton variant="text" height={28} width="70%" />
          </Stack>
        )}
      </Box>
    </Stack>
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
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <Typography variant="body1" sx={{ fontWeight: highlight ? 600 : 400 }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: highlight ? "primary.main" : "text.primary" }}
      >
        {value}
      </Typography>
    </Box>
  );
}
