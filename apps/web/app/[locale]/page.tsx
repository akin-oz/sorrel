"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";

import { BrandLogo } from "@sorrel/ui";

import { Link } from "../../i18n/navigation";

export default function Home() {
  const t = useTranslations("Landing");
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2.5,
        px: 2.5,
        py: 6,
        textAlign: "center",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <BrandLogo size={40} color="#A14D27" title="Sorrel" />
        <Typography
          variant="h2"
          component="span"
          sx={{ fontSize: "1.6rem", color: "primary.main" }}
        >
          Sorrel
        </Typography>
      </Box>
      <Typography variant="h1" sx={{ maxWidth: "32rem", fontSize: "clamp(1.9rem, 6vw, 2.6rem)" }}>
        {t("headline")}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: "30rem" }}>
        {t("subcopy")}
      </Typography>
      <Button
        component={Link}
        href="/wizard/cats"
        variant="contained"
        size="large"
        sx={{ mt: 1, px: 3.5 }}
      >
        {t("cta")}
      </Button>
    </Box>
  );
}
