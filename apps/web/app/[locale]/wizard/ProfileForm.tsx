"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import {
  AppField,
  AppSkeleton,
  AppStack,
  AppText,
  AppToggleGroup,
  AppToggleOption,
} from "@sorrel/ui";

import { useFunnel } from "./FunnelProvider";
import { stepValidity } from "./validation";

const AGE_OPTIONS = ["kitten", "young", "adult", "senior"] as const;
const WEIGHT_OPTIONS = ["s", "m", "l", "xl"] as const;
const DEFAULT_AGE = "young";
const DEFAULT_WEIGHT = "m";

/** Labelled single-select pill group (variant A's age/weight). Starts unselected so
 *  the choice is explicit; the group's accessible name is its visible label. */
function PillField({
  label,
  value,
  options,
  labelFor,
  onSelect,
}: {
  label: string;
  value: string | undefined;
  options: readonly string[];
  labelFor: (key: string) => string;
  onSelect: (value: string) => void;
}) {
  return (
    <AppStack gap={1}>
      <AppText variant="body2" fontWeight={600} color="text.secondary">
        {label}
      </AppText>
      <AppToggleGroup
        layout="pills"
        value={value ?? null}
        onChange={(_e, next) => {
          if (typeof next === "string") onSelect(next);
        }}
        aria-label={label}
      >
        {options.map((key) => (
          <AppToggleOption key={key} value={key}>
            {labelFor(key)}
          </AppToggleOption>
        ))}
      </AppToggleGroup>
    </AppStack>
  );
}

/**
 * The PROFILE A/B form (spec 014, control reworked by spec 022) — the 39→65 lever,
 * with validation (spec 020).
 *
 *   Variant A (control): name is free-text; age + weight are single-select pill
 *     groups (every option visible) that start unselected, so the A/B is a genuine
 *     UX question — all-options-visible vs dropdown-with-defaults.
 *   Variant B (test): selects pre-set to sensible defaults, seeded into state so
 *     the plan + validation reflect what's on screen (no choice needed).
 *
 * The variant comes from PostHog (via the provider) and resolves async, so this
 * renders a stable skeleton until it is known — identical on the server and the
 * first client render, so no hydration mismatch.
 */
export function ProfileForm() {
  const t = useTranslations("Profile");
  const { variant, state, dispatch, track } = useFunnel();
  const cat = state.cats[0];
  const [nameTouched, setNameTouched] = useState(false);

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
      <AppStack gap={2}>
        {[0, 1, 2].map((i) => (
          <AppSkeleton key={i} variant="rounded" height={56} />
        ))}
      </AppStack>
    );
  }

  // Only `name` is free-text, so it is the only field with a blur-based error
  // (the pills can't be left half-typed; the Continue gate, spec 020, covers
  // an unselected age/weight). `name`'s field_error is unchanged in both arms.
  const { errors } = stepValidity("PROFILE", state);
  const nameError = nameTouched && Boolean(errors.name);
  function blurName(value: string | undefined) {
    setNameTouched(true);
    if (!value?.trim()) {
      track({ name: "field_error", step: "PROFILE", field: "name", error: "required" });
    }
  }

  return (
    <AppStack gap={2}>
      <AppField
        label={t("name")}
        placeholder={t("namePlaceholder")}
        value={cat?.name ?? ""}
        onChange={(e) => dispatch({ type: "SET_CAT", cat: { name: e.target.value } })}
        onBlur={(e) => blurName(e.target.value)}
        error={nameError}
        helperText={nameError ? t("required") : undefined}
        fullWidth
      />

      {variant === "A" ? (
        <>
          <PillField
            label={t("age")}
            value={cat?.age}
            options={AGE_OPTIONS}
            labelFor={(key) => t(`ageOptions.${key}`)}
            onSelect={(age) => dispatch({ type: "SET_CAT", cat: { age } })}
          />
          <PillField
            label={t("weight")}
            value={cat?.weight}
            options={WEIGHT_OPTIONS}
            labelFor={(key) => t(`weightOptions.${key}`)}
            onSelect={(weight) => dispatch({ type: "SET_CAT", cat: { weight } })}
          />
        </>
      ) : (
        <>
          <AppField
            select
            label={t("age")}
            value={cat?.age ?? DEFAULT_AGE}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { age: e.target.value } })}
            options={AGE_OPTIONS.map((key) => ({ value: key, label: t(`ageOptions.${key}`) }))}
            fullWidth
          />
          <AppField
            select
            label={t("weight")}
            value={cat?.weight ?? DEFAULT_WEIGHT}
            onChange={(e) => dispatch({ type: "SET_CAT", cat: { weight: e.target.value } })}
            options={WEIGHT_OPTIONS.map((key) => ({
              value: key,
              label: t(`weightOptions.${key}`),
            }))}
            fullWidth
          />
        </>
      )}
    </AppStack>
  );
}
