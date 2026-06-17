"use client";

import { useLocale, useTranslations } from "next-intl";

import { AppStack, AppText } from "@sorrel/ui";

import { usePathname, useRouter } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";

/** EN/DE toggle that swaps the locale while keeping the current path. */
export function LocaleSwitcher() {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");

  return (
    <AppStack direction="row" gap={0.25} role="radiogroup" aria-label={t("label")}>
      {routing.locales.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={isActive}
            className="app-unstyled-button app-locale-toggle"
            onClick={() => router.replace(pathname, { locale })}
          >
            <AppText
              component="span"
              fontSize={13}
              fontWeight={isActive ? 700 : 500}
              color={isActive ? "primary.main" : "text.secondary"}
            >
              {t(locale)}
            </AppText>
          </button>
        );
      })}
    </AppStack>
  );
}
