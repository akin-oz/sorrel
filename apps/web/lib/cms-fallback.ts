import type { FeatureIcon, PageBlok, RecipeBlok } from "../types/storyblok.gen";

/**
 * Offline fallback content (specs 011 + 012) — used when no Storyblok token is
 * set, so the build, the deterministic demo, and CI stay green with zero CMS
 * config. Mirrors the design handoff's nine-blok landing; the live space
 * overrides it once wired.
 */
interface HomeStrings {
  nav: { cta: string };
  hero: {
    eyebrow: string;
    headline: string;
    subcopy: string;
    cta: string;
    reassurance: string;
  };
  features: { heading: string; items: { icon: FeatureIcon; title: string; body: string }[] };
  how: { eyebrow: string; heading: string; steps: { title: string; body: string }[] };
  menu: { eyebrow: string; heading: string; subcopy: string };
  testimonials: { eyebrow: string; items: { quote: string; attribution: string }[] };
  faq: { heading: string; items: { question: string; answer: string }[] };
  cta: { heading: string; subcopy: string; label: string };
  footer: {
    columns: { heading: string; links: { label: string; href?: string }[] }[];
    legal: string;
  };
}

const HOME: Record<string, HomeStrings> = {
  en: {
    nav: { cta: "Build your plan" },
    hero: {
      eyebrow: "Fresh, vet-formulated cat food",
      headline: "Fresh food, tailored to your cat.",
      subcopy:
        "Answer a few questions and we'll build a plan around your cats' needs — recipes, portions, and a first delivery day that suits you.",
      cta: "Build your plan",
      reassurance: "Vet-formulated · Free delivery · Cancel anytime",
    },
    features: {
      heading: "Why cats (and their humans) love Sorrel",
      items: [
        {
          icon: "vet",
          title: "Vet-formulated",
          body: "Recipes designed with feline nutritionists.",
        },
        {
          icon: "portion",
          title: "Portioned for your cat",
          body: "Right-sized meals, tuned to age and weight.",
        },
        {
          icon: "delivery",
          title: "Delivered when you want",
          body: "Pick a day that suits you — change it anytime.",
        },
      ],
    },
    how: {
      eyebrow: "Three steps",
      heading: "How it works",
      steps: [
        {
          title: "Tell us about your cat",
          body: "Name, age, weight, fussiness — it takes about two minutes.",
        },
        {
          title: "Pick recipes & a delivery day",
          body: "Filter by what suits them, then choose a first delivery day that fits your week.",
        },
        {
          title: "Fresh food arrives",
          body: "Portioned, fresh, on your doorstep. Skip or change anytime.",
        },
      ],
    },
    menu: {
      eyebrow: "The menu",
      heading: "The recipes",
      subcopy: "Filter by what suits your cat inside the plan builder.",
    },
    testimonials: {
      eyebrow: "From Sorrel households",
      items: [
        {
          quote: "Miso is fussy to the bone — she cleared the bowl on day one.",
          attribution: "Hana & Miso · London",
        },
        {
          quote: "The delivery day actually fits our week. That's the bit I didn't expect.",
          attribution: "Tom & Clementine · Leeds",
        },
      ],
    },
    faq: {
      heading: "Questions, answered",
      items: [
        {
          question: "What's in the recipes?",
          answer:
            "Gently cooked meat and vet-approved ingredients, portioned for cats — no fillers, no mystery.",
        },
        {
          question: "How much does it cost?",
          answer:
            "Plans start from £1.60 a day, portioned to your cat's age and weight. You'll see your exact price before checkout.",
        },
        {
          question: "Can I change my delivery day?",
          answer:
            "Yes — pick any deliverable day when you build your plan, and change it whenever you need.",
        },
        {
          question: "What if my cat turns her nose up?",
          answer: "Fussy starts are normal. Tell us what happened and we'll help you swap recipes.",
        },
        {
          question: "Can I pause or cancel?",
          answer: "Anytime, in a couple of clicks — no fees, no lock-in.",
        },
      ],
    },
    cta: {
      heading: "Ready to build your cat's plan?",
      subcopy: "About two minutes — and you can change everything later.",
      label: "Build your plan",
    },
    footer: {
      columns: [
        {
          heading: "Shop",
          links: [
            { label: "Build your plan", href: "/wizard/cats" },
            { label: "Recipes", href: "#recipes" },
          ],
        },
        {
          heading: "Help",
          links: [{ label: "FAQ", href: "#faq" }, { label: "Delivery" }, { label: "Contact" }],
        },
        {
          heading: "Company",
          links: [{ label: "About" }, { label: "Privacy" }, { label: "Terms" }],
        },
      ],
      legal:
        "© 2026 Sorrel. A fictional brand built for demonstration — no real products, prices, or testimonials.",
    },
  },
  de: {
    nav: { cta: "Plan erstellen" },
    hero: {
      eyebrow: "Frisches, tierärztlich entwickeltes Katzenfutter",
      headline: "Frisches Futter, auf deine Katze abgestimmt.",
      subcopy:
        "Beantworte ein paar Fragen, und wir stellen einen Plan zusammen, der zu deinen Katzen passt — Rezepte, Portionen und ein erster Liefertag, der dir passt.",
      cta: "Plan erstellen",
      reassurance: "Tierärztlich entwickelt · Kostenlose Lieferung · Jederzeit kündbar",
    },
    features: {
      heading: "Warum Katzen (und ihre Menschen) Sorrel lieben",
      items: [
        {
          icon: "vet",
          title: "Tierärztlich entwickelt",
          body: "Rezepte, entwickelt mit Katzenernährungsexperten.",
        },
        {
          icon: "portion",
          title: "Portioniert für deine Katze",
          body: "Passgenaue Mahlzeiten, abgestimmt auf Alter und Gewicht.",
        },
        {
          icon: "delivery",
          title: "Geliefert, wann du willst",
          body: "Wähle einen passenden Tag — jederzeit änderbar.",
        },
      ],
    },
    how: {
      eyebrow: "Drei Schritte",
      heading: "So funktioniert's",
      steps: [
        {
          title: "Erzähl uns von deiner Katze",
          body: "Name, Alter, Gewicht, Mäkeligkeit — dauert etwa zwei Minuten.",
        },
        {
          title: "Wähle Rezepte & einen Liefertag",
          body: "Filtere nach dem, was passt, und wähle einen ersten Liefertag, der in deine Woche passt.",
        },
        {
          title: "Frisches Futter kommt an",
          body: "Portioniert, frisch, direkt vor die Tür. Jederzeit aussetzen oder ändern.",
        },
      ],
    },
    menu: {
      eyebrow: "Das Menü",
      heading: "Die Rezepte",
      subcopy: "Filtere im Plan-Builder nach dem, was zu deiner Katze passt.",
    },
    testimonials: {
      eyebrow: "Aus Sorrel-Haushalten",
      items: [
        {
          quote: "Miso ist durch und durch mäkelig — am ersten Tag war der Napf leer.",
          attribution: "Hana & Miso · London",
        },
        {
          quote: "Der Liefertag passt wirklich in unsere Woche. Damit hatte ich nicht gerechnet.",
          attribution: "Tom & Clementine · Leeds",
        },
      ],
    },
    faq: {
      heading: "Fragen, beantwortet",
      items: [
        {
          question: "Was steckt in den Rezepten?",
          answer:
            "Schonend gegartes Fleisch und tierärztlich geprüfte Zutaten, für Katzen portioniert — ohne Füllstoffe, ohne Rätselraten.",
        },
        {
          question: "Was kostet es?",
          answer:
            "Pläne starten ab 1,60 £ pro Tag, portioniert nach Alter und Gewicht deiner Katze. Den genauen Preis siehst du vor dem Checkout.",
        },
        {
          question: "Kann ich meinen Liefertag ändern?",
          answer:
            "Ja — wähle beim Erstellen deines Plans einen lieferbaren Tag und ändere ihn jederzeit.",
        },
        {
          question: "Und wenn meine Katze die Nase rümpft?",
          answer:
            "Ein mäkeliger Start ist normal. Erzähl uns davon, und wir helfen beim Rezeptwechsel.",
        },
        {
          question: "Kann ich pausieren oder kündigen?",
          answer: "Jederzeit, mit ein paar Klicks — ohne Gebühren, ohne Bindung.",
        },
      ],
    },
    cta: {
      heading: "Bereit, den Plan deiner Katze zu erstellen?",
      subcopy: "Etwa zwei Minuten — und du kannst später alles ändern.",
      label: "Plan erstellen",
    },
    footer: {
      columns: [
        {
          heading: "Shop",
          links: [
            { label: "Plan erstellen", href: "/wizard/cats" },
            { label: "Rezepte", href: "#recipes" },
          ],
        },
        {
          heading: "Hilfe",
          links: [{ label: "FAQ", href: "#faq" }, { label: "Lieferung" }, { label: "Kontakt" }],
        },
        {
          heading: "Unternehmen",
          links: [{ label: "Über uns" }, { label: "Datenschutz" }, { label: "AGB" }],
        },
      ],
      legal:
        "© 2026 Sorrel. Eine fiktive Marke zu Demonstrationszwecken — keine echten Produkte, Preise oder Bewertungen.",
    },
  },
};

export function homeFallbackContent(locale: string): PageBlok {
  const s = HOME[locale] ?? HOME.en;
  return {
    _uid: "fallback-page",
    component: "page",
    body: [
      {
        _uid: "fallback-nav",
        component: "site_nav",
        ctaLabel: s.nav.cta,
        ctaHref: "/wizard/cats",
      },
      {
        _uid: "fallback-hero",
        component: "hero",
        eyebrow: s.hero.eyebrow,
        headline: s.hero.headline,
        subcopy: s.hero.subcopy,
        ctaLabel: s.hero.cta,
        ctaHref: "/wizard/cats",
        reassurance: s.hero.reassurance,
      },
      {
        _uid: "fallback-grid",
        component: "feature_grid",
        heading: s.features.heading,
        items: s.features.items.map((f, i) => ({
          _uid: `fallback-feature-${i}`,
          component: "feature_item",
          icon: f.icon,
          title: f.title,
          body: f.body,
        })),
      },
      {
        _uid: "fallback-how",
        component: "how_it_works",
        eyebrow: s.how.eyebrow,
        heading: s.how.heading,
        steps: s.how.steps.map((step, i) => ({
          _uid: `fallback-how-step-${i}`,
          component: "how_step",
          title: step.title,
          body: step.body,
        })),
      },
      {
        _uid: "fallback-menu",
        component: "recipe_showcase",
        eyebrow: s.menu.eyebrow,
        heading: s.menu.heading,
        subcopy: s.menu.subcopy,
      },
      {
        _uid: "fallback-testimonials",
        component: "testimonial_section",
        eyebrow: s.testimonials.eyebrow,
        items: s.testimonials.items.map((item, i) => ({
          _uid: `fallback-testimonial-${i}`,
          component: "testimonial_item",
          quote: item.quote,
          attribution: item.attribution,
        })),
      },
      {
        _uid: "fallback-faq",
        component: "faq_section",
        heading: s.faq.heading,
        items: s.faq.items.map((item, i) => ({
          _uid: `fallback-faq-${i}`,
          component: "faq_item",
          question: item.question,
          answer: item.answer,
        })),
      },
      {
        _uid: "fallback-cta",
        component: "cta_section",
        heading: s.cta.heading,
        subcopy: s.cta.subcopy,
        ctaLabel: s.cta.label,
        ctaHref: "/wizard/cats",
      },
      {
        _uid: "fallback-footer",
        component: "site_footer",
        columns: s.footer.columns.map((column, i) => ({
          _uid: `fallback-footer-col-${i}`,
          component: "footer_column",
          heading: column.heading,
          links: column.links.map((link, j) => ({
            _uid: `fallback-footer-link-${i}-${j}`,
            component: "footer_link",
            label: link.label,
            href: link.href,
          })),
        })),
        legal: s.footer.legal,
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
