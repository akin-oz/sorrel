import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
import { notFound } from "next/navigation";

import { routing } from "../../i18n/routing";
import { SITE_URL } from "../../lib/site";
import { StoryblokProvider } from "../_cms/StoryblokProvider";
import "../globals.css";
import theme from "../theme";

// display:swap + preload the fonts in the first paint (serif headline is the LCP
// element; sans is body copy) so text renders immediately (spec 015 LCP lever).
const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
  preload: true,
});
const sans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  // Not in the first paint — don't spend an LCP preload slot on it.
  preload: false,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE_URL),
    title: "Sorrel — fresh food, tailored to your cat",
    description: "Build a tailored fresh-food plan for your cats in a few quick steps.",
    alternates: {
      // en is unprefixed (localePrefix: "as-needed"); de is /de.
      canonical: locale === routing.defaultLocale ? "/" : `/${locale}`,
      languages: { en: "/", de: "/de", "x-default": "/" },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StoryblokProvider>
            <AppRouterCacheProvider>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
              </ThemeProvider>
            </AppRouterCacheProvider>
          </StoryblokProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
