import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  AppBox,
  AppCard,
  AppContainer,
  AppGrid,
  AppHeading,
  AppMeter,
  AppStack,
  AppText,
  sorrelTheme,
} from "@sorrel/ui";

import staticInsights from "../../../lib/insights-data.json";
import { type InsightsData, fetchLiveInsights } from "../../../lib/insights-posthog";

// ISR: rebuild at most hourly so the live PostHog read stays fresh without hammering
// the Query API on every request (spec 023).
export const revalidate = 3600;

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Insights");

  // Live PostHog funnel when a server key is present; else the deterministic static
  // JSON (keyless CI/offline builds render this — the fallback is the "error" state).
  const live = await fetchLiveInsights();
  const insights: InsightsData = live ?? (staticInsights as InsightsData);
  const source = live ? "live" : "seed";

  const { steps, variants } = insights;
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const liftPp = ((variants.B.completionRate - variants.A.completionRate) * 100).toFixed(1);

  function funnel(
    label: string,
    data: { viewed: number[]; completionRate: number },
    color: string,
  ) {
    const cohort = data.viewed[0] || 1;
    return (
      <AppCard
        tone="paper"
        radius="16px"
        padding={{ xs: 2, sm: 2.5 }}
        direction="column"
        gap={1.25}
      >
        <AppStack direction="row" alignItems="baseline" justifyContent="space-between">
          <AppText fontWeight={700} color={color}>
            {label}
          </AppText>
          <AppHeading level={3} component="span" fontSize={22} fontWeight={700}>
            {pct.format(data.completionRate)}
          </AppHeading>
        </AppStack>
        {steps.map((step, i) => (
          <AppStack key={step} direction="row" alignItems="center" gap={1.5}>
            <AppBox width={70} flexShrink={0}>
              <AppText fontSize={13} color="text.secondary">
                {t(`stepLabels.${step}`)}
              </AppText>
            </AppBox>
            <AppMeter value={data.viewed[i] / cohort} color={color} />
            <AppBox width={48} flexShrink={0} textAlign="right">
              <AppText fontSize={13}>{pct.format(data.viewed[i] / cohort)}</AppText>
            </AppBox>
          </AppStack>
        ))}
      </AppCard>
    );
  }

  function stat(label: string, value: string, color?: string) {
    return (
      <AppStack gap={0.25}>
        <AppText variant="overline" color={sorrelTheme.mono} lineHeight={1.4}>
          {label}
        </AppText>
        <AppHeading level={3} component="span" fontSize={28} fontWeight={700} color={color}>
          {value}
        </AppHeading>
      </AppStack>
    );
  }

  return (
    <AppContainer component="main" width="52rem" px={{ xs: 2, sm: 3 }} py={{ xs: 4, sm: 6 }}>
      <AppHeading level={1} fontSize={{ xs: 28, sm: 36 }}>
        {t("title")}
      </AppHeading>
      <AppBox mt={1} maxWidth="40rem">
        <AppText color="text.secondary">{t("subtitle")}</AppText>
      </AppBox>

      <AppStack direction="row" wrap gap={{ xs: 3, sm: 6 }} my={{ xs: 3, sm: 4 }}>
        {stat(`${t("variantA")} · ${t("completion")}`, pct.format(variants.A.completionRate))}
        {stat(
          `${t("variantB")} · ${t("completion")}`,
          pct.format(variants.B.completionRate),
          "primary.main",
        )}
        {stat(t("lift"), `+${liftPp} pp`, "primary.main")}
      </AppStack>

      <AppGrid columns={{ xs: "1fr", md: "1fr 1fr" }} gap={2}>
        {funnel(t("variantA"), variants.A, sorrelTheme.mono)}
        {funnel(t("variantB"), variants.B, "primary.main")}
      </AppGrid>

      <AppBox mt={3}>
        <AppText fontSize={12} color={sorrelTheme.mono}>
          {t(source === "live" ? "disclaimerLive" : "disclaimer")}
        </AppText>
      </AppBox>
    </AppContainer>
  );
}
