import type { PageBlok, RecipeBlok } from "../types/storyblok.gen";

/**
 * Offline fallback content (spec 011) — used when no Storyblok token is set, so
 * the build, the deterministic demo, and CI stay green with zero CMS config.
 * Mirrors the spec-010 landing; the live space overrides it once wired.
 */
interface HomeStrings {
  headline: string;
  subcopy: string;
  cta: string;
  featuresHeading: string;
  features: { title: string; body: string }[];
  ctaHeading: string;
}

const HOME: Record<string, HomeStrings> = {
  en: {
    headline: "Fresh food, tailored to your cat.",
    subcopy:
      "Answer a few questions and we'll build a plan around your cats' needs — recipes, portions, and a first delivery day that suits you.",
    cta: "Build your plan",
    featuresHeading: "Why cats (and their humans) love Sorrel",
    features: [
      { title: "Vet-formulated", body: "Recipes designed with feline nutritionists." },
      { title: "Portioned for your cat", body: "Right-sized meals, tuned to age and weight." },
      { title: "Delivered when you want", body: "Pick a day that suits you — change it anytime." },
    ],
    ctaHeading: "Ready to build your cat's plan?",
  },
  de: {
    headline: "Frisches Futter, auf deine Katze abgestimmt.",
    subcopy:
      "Beantworte ein paar Fragen, und wir stellen einen Plan zusammen, der zu deinen Katzen passt — Rezepte, Portionen und ein erster Liefertag, der dir passt.",
    cta: "Plan erstellen",
    featuresHeading: "Warum Katzen (und ihre Menschen) Sorrel lieben",
    features: [
      {
        title: "Tierärztlich entwickelt",
        body: "Rezepte, entwickelt mit Katzenernährungsexperten.",
      },
      {
        title: "Portioniert für deine Katze",
        body: "Passgenaue Mahlzeiten, abgestimmt auf Alter und Gewicht.",
      },
      {
        title: "Geliefert, wann du willst",
        body: "Wähle einen passenden Tag — jederzeit änderbar.",
      },
    ],
    ctaHeading: "Bereit, den Plan deiner Katze zu erstellen?",
  },
};

export function homeFallbackContent(locale: string): PageBlok {
  const s = HOME[locale] ?? HOME.en;
  return {
    _uid: "fallback-page",
    component: "page",
    body: [
      {
        _uid: "fallback-hero",
        component: "hero",
        headline: s.headline,
        subcopy: s.subcopy,
        ctaLabel: s.cta,
        ctaHref: "/wizard/cats",
      },
      {
        _uid: "fallback-grid",
        component: "feature_grid",
        heading: s.featuresHeading,
        items: s.features.map((f, i) => ({
          _uid: `fallback-feature-${i}`,
          component: "feature_item",
          title: f.title,
          body: f.body,
        })),
      },
      {
        _uid: "fallback-cta",
        component: "cta_section",
        heading: s.ctaHeading,
        ctaLabel: s.cta,
        ctaHref: "/wizard/cats",
      },
    ],
  };
}

const RECIPES: Record<string, RecipeBlok[]> = {
  en: [
    {
      _uid: "fallback-recipe-1",
      component: "recipe",
      name: "Wild-caught salmon",
      slug: "wild-caught-salmon",
      description: "Omega-rich salmon for a glossy coat — grain- and chicken-free.",
      dietaryTags: ["GRAIN_FREE", "CHICKEN_FREE"],
    },
    {
      _uid: "fallback-recipe-2",
      component: "recipe",
      name: "Pasture turkey",
      slug: "pasture-turkey",
      description: "Gentle, lean turkey for sensitive tummies.",
      dietaryTags: ["SENSITIVE", "CHICKEN_FREE"],
    },
    {
      _uid: "fallback-recipe-3",
      component: "recipe",
      name: "Free-run duck",
      slug: "free-run-duck",
      description: "A novel protein for fussy eaters, grain-free.",
      dietaryTags: ["GRAIN_FREE"],
    },
  ],
  de: [
    {
      _uid: "fallback-recipe-1",
      component: "recipe",
      name: "Wildlachs",
      slug: "wild-caught-salmon",
      description: "Omega-reicher Lachs für glänzendes Fell — getreide- und hühnerfrei.",
      dietaryTags: ["GRAIN_FREE", "CHICKEN_FREE"],
    },
    {
      _uid: "fallback-recipe-2",
      component: "recipe",
      name: "Weide-Pute",
      slug: "pasture-turkey",
      description: "Milde, magere Pute für empfindliche Mägen.",
      dietaryTags: ["SENSITIVE", "CHICKEN_FREE"],
    },
    {
      _uid: "fallback-recipe-3",
      component: "recipe",
      name: "Freiland-Ente",
      slug: "free-run-duck",
      description: "Eine neue Proteinquelle für wählerische Esser, getreidefrei.",
      dietaryTags: ["GRAIN_FREE"],
    },
  ],
};

export function recipeFallback(locale: string): RecipeBlok[] {
  return RECIPES[locale] ?? RECIPES.en;
}
