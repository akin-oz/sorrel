"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { storyblokEditable } from "@storyblok/react/rsc";
import { useTranslations } from "next-intl";

import { isDietaryTag } from "../../lib/dietary";
import type { RecipeBlok } from "../../types/storyblok.gen";

export function RecipeCard({ blok }: { blok: RecipeBlok }) {
  const t = useTranslations("Recipes");
  return (
    <Box
      {...storyblokEditable(blok)}
      sx={{
        border: "1.5px solid",
        borderColor: "divider",
        borderRadius: "16px",
        overflow: "hidden",
        bgcolor: "#FFFFFF",
      }}
    >
      <Box
        aria-hidden
        sx={{
          height: 120,
          background:
            "repeating-linear-gradient(45deg,#F1E7D9,#F1E7D9 10px,#EBDFCE 10px,#EBDFCE 20px)",
        }}
      />
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="h3" sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
          {blok.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {blok.description}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
          {blok.dietaryTags.filter(isDietaryTag).map((tag) => (
            <Chip key={tag} label={t(`tags.${tag}`)} size="small" variant="outlined" />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
