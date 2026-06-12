"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { BrandLogo } from "@sorrel/ui";

export default function Home() {
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
        Fresh food, tailored to your cat.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: "30rem" }}>
        Answer a few questions and we&apos;ll build a plan around your cats&apos; needs — recipes,
        portions, and a first delivery day that suits you.
      </Typography>
      <Button
        component={Link}
        href="/wizard/cats"
        variant="contained"
        size="large"
        sx={{ mt: 1, px: 3.5 }}
      >
        Build your plan
      </Button>
    </Box>
  );
}
