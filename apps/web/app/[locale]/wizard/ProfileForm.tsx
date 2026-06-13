"use client";

import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";

import { useFunnel } from "./FunnelProvider";
import { stepValidity } from "./validation";

const AGE_OPTIONS = ["kitten", "young", "adult", "senior"] as const;
const WEIGHT_OPTIONS = ["s", "m", "l", "xl"] as const;
const DEFAULT_AGE = "young";
const DEFAULT_WEIGHT = "m";

type ProfileField = "name" | "age" | "weight";

/**
 * The PROFILE A/B form (spec 014) — the 39→65 lever, with validation (spec 020).
 *
 *   Variant A (control): free-text inputs; empty required fields show an inline
 *     error on blur and fire `field_error` — the friction the autocomplete removes.
 *   Variant B (test): selects pre-set to sensible defaults, seeded into state so
 *     the plan + validation reflect what's on screen (no free-text stalls).
 *
 * The variant comes from PostHog (via the provider) and resolves async, so this
 * renders a stable skeleton until it is known — identical on the server and the
 * first client render, so no hydration mismatch.
 */
export function ProfileForm() {
  const t = useTranslations("Profile");
  const { variant, state, dispatch, track } = useFunnel();
  const cat = state.cats[0];
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Variant B's selects display defaults; commit them to state so validation and
  // the plan reflect the on-screen values (the smart-default that removes friction).
  useEffect(() => {
    if (variant !== "B") return;
    const patch: Partial<{ age: string; weight: string }> = {};
    if (!cat?.age) patch.age = DEFAULT_AGE;
    if (!cat?.weight) patch.weight = DEFAULT_WEIGHT;
    if (Object.keys(patch).length > 0) dispatch({ type: "SET_CAT", cat: patch });
  }, [variant, cat?.age, cat?.weight, dispatch]);

  if (!variant) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
      </Box>
    );
  }

  const { errors } = stepValidity("PROFILE", state);
  function blur(field: ProfileField, value: string | undefined) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (!value?.trim()) track({ name: "field_error", step: "PROFILE", field, error: "required" });
  }
  const showError = (field: ProfileField) => Boolean(touched[field] && errors[field]);
  const helperText = (field: ProfileField) => (showError(field) ? t("required") : undefined);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label={t("name")}
        placeholder={t("namePlaceholder")}
        value={cat?.name ?? ""}
        onChange={(e) => dispatch({ type: "SET_CAT", cat: { name: e.target.value } })}
        onBlur={(e) => blur("name", e.target.value)}
        error={showError("name")}
        helperText={helperText("name")}
        fullWidth
      />

      {variant === "A" ? (
        <>
          <TextField
            label={t("age")}
            placeholder={t("agePlaceholder")}
            value={cat?.age ?? ""}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { age: e.target.value } })}
            onBlur={(e) => blur("age", e.target.value)}
            error={showError("age")}
            helperText={helperText("age")}
            fullWidth
          />
          <TextField
            label={t("weight")}
            placeholder={t("weightPlaceholder")}
            value={cat?.weight ?? ""}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { weight: e.target.value } })}
            onBlur={(e) => blur("weight", e.target.value)}
            error={showError("weight")}
            helperText={helperText("weight")}
            fullWidth
          />
        </>
      ) : (
        <>
          <TextField
            select
            label={t("age")}
            value={cat?.age ?? DEFAULT_AGE}
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
            value={cat?.weight ?? DEFAULT_WEIGHT}
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
