"use client";

import { useTranslations } from "next-intl";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";

import { useFunnel } from "./FunnelProvider";

const AGE_OPTIONS = ["kitten", "young", "adult", "senior"] as const;
const WEIGHT_OPTIONS = ["s", "m", "l", "xl"] as const;

/**
 * The PROFILE A/B form (spec 014) — the 39→65 lever, live.
 *
 *   Variant A (control): free-text inputs. Empty fields fire `field_error` — the
 *     friction the autocomplete removes.
 *   Variant B (test): selects pre-set to sensible defaults; no free-text stalls.
 *
 * The variant comes from PostHog (via the provider) and resolves async, so this
 * renders a stable skeleton until it is known — identical on the server and the
 * first client render, so no hydration mismatch.
 */
export function ProfileForm() {
  const t = useTranslations("Profile");
  const { variant, state, dispatch, track } = useFunnel();
  const cat = state.cats[0];

  if (!variant) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
      </Box>
    );
  }

  function requireOnBlur(field: string, value: string | undefined) {
    if (!value?.trim()) track({ name: "field_error", step: "PROFILE", field, error: "required" });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label={t("name")}
        placeholder={t("namePlaceholder")}
        value={cat?.name ?? ""}
        onChange={(e) => dispatch({ type: "SET_CAT", cat: { name: e.target.value } })}
        onBlur={(e) => requireOnBlur("name", e.target.value)}
        fullWidth
      />

      {variant === "A" ? (
        <>
          <TextField
            label={t("age")}
            placeholder={t("agePlaceholder")}
            value={cat?.age ?? ""}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { age: e.target.value } })}
            onBlur={(e) => requireOnBlur("age", e.target.value)}
            fullWidth
          />
          <TextField
            label={t("weight")}
            placeholder={t("weightPlaceholder")}
            value={cat?.weight ?? ""}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { weight: e.target.value } })}
            onBlur={(e) => requireOnBlur("weight", e.target.value)}
            fullWidth
          />
        </>
      ) : (
        <>
          <TextField
            select
            label={t("age")}
            value={cat?.age ?? "young"}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { age: e.target.value } })}
            fullWidth
          >
            {AGE_OPTIONS.map((key) => (
              <MenuItem key={key} value={key}>
                {t(`ageOptions.${key}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("weight")}
            value={cat?.weight ?? "m"}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { weight: e.target.value } })}
            fullWidth
          >
            {WEIGHT_OPTIONS.map((key) => (
              <MenuItem key={key} value={key}>
                {t(`weightOptions.${key}`)}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
    </Box>
  );
}
