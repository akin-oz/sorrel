"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "../../../i18n/navigation";
import { routing } from "../../../i18n/routing";

/** EN/DE toggle that swaps the locale while keeping the current path. */
export function LocaleSwitcher() {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");

  return (
    <Box role="group" aria-label={t("label")} sx={{ display: "flex", gap: 0.25 }}>
      {routing.locales.map((locale) => (
        <Button
          key={locale}
          size="small"
          onClick={() => router.replace(pathname, { locale })}
          aria-current={locale === active ? "true" : undefined}
          sx={{
            minWidth: 32,
            px: 0.75,
            fontSize: 13,
            fontWeight: locale === active ? 700 : 500,
            color: locale === active ? "primary.main" : "text.secondary",
          }}
        >
          {t(locale)}
        </Button>
      ))}
    </Box>
  );
}
