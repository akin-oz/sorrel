import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { getTranslations, setRequestLocale } from "next-intl/server";

import insights from "../../../lib/insights-data.json";

const MUTED = "#A8967F";

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Insights");

  const { sessionsPerVariant, steps, variants } = insights;
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const liftPp = ((variants.B.completionRate - variants.A.completionRate) * 100).toFixed(1);

  function funnel(
    label: string,
    data: { viewed: number[]; completionRate: number },
    color: string,
  ) {
    return (
      <Box
        sx={{
          bgcolor: "background.paper",
          border: "1.5px solid",
          borderColor: "divider",
          borderRadius: "16px",
          p: { xs: 2, sm: 2.5 },
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 700, color }}>{label}</Typography>
          <Typography sx={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 700 }}>
            {pct.format(data.completionRate)}
          </Typography>
        </Box>
        {steps.map((step, i) => (
          <Box key={step} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ width: 70, flexShrink: 0, fontSize: 13, color: "text.secondary" }}>
              {t(`stepLabels.${step}`)}
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: 22,
                borderRadius: "6px",
                bgcolor: "#ECE4D9",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${(data.viewed[i] / sessionsPerVariant) * 100}%`,
                  height: "100%",
                  bgcolor: color,
                }}
              />
            </Box>
            <Typography
              sx={{
                width: 48,
                flexShrink: 0,
                textAlign: "right",
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pct.format(data.viewed[i] / sessionsPerVariant)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  function stat(label: string, value: string, color?: string) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
        <Typography variant="overline" sx={{ color: MUTED, lineHeight: 1.4 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color }}>
          {value}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        maxWidth: "52rem",
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 4, sm: 6 },
      }}
    >
      <Typography variant="h1" sx={{ fontSize: { xs: 28, sm: 36 } }}>
        {t("title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: "40rem" }}>
        {t("subtitle")}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 3, sm: 6 }, my: { xs: 3, sm: 4 } }}>
        {stat(`${t("variantA")} · ${t("completion")}`, pct.format(variants.A.completionRate))}
        {stat(
          `${t("variantB")} · ${t("completion")}`,
          pct.format(variants.B.completionRate),
          "primary.main",
        )}
        {stat(t("lift"), `+${liftPp} pp`, "primary.main")}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        {funnel(t("variantA"), variants.A, MUTED)}
        {funnel(t("variantB"), variants.B, "primary.main")}
      </Box>

      <Typography sx={{ mt: 3, fontSize: 12, color: MUTED }}>{t("disclaimer")}</Typography>
    </Box>
  );
}
