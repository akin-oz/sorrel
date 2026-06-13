/**
 * Storyblok space provisioning (spec 011) — idempotent.
 *
 * Creates the blok component schemas and seeds the `home` story + recipe stories
 * so the live site renders from the CMS (not just the offline fallback), with
 * field-level en/de translations and visual editing ready. Content is sourced
 * from the same `homeFallbackContent` / `recipeFallback` the app falls back to,
 * so the CMS and the design never disagree.
 *
 * Run:  STORYBLOK_PERSONAL_ACCESS_TOKEN=… SPACE_ID=… \
 *         yarn workspace @sorrel/frontend exec tsx scripts/storyblok-setup.ts
 */
import { homeFallbackContent, recipeFallback } from "../lib/cms-fallback";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const PAT = process.env.STORYBLOK_PERSONAL_ACCESS_TOKEN;
const SPACE_ID = process.env.SPACE_ID ?? "293145574834651";
const BASE = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`;

if (!PAT) {
  console.error("STORYBLOK_PERSONAL_ACCESS_TOKEN is required.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mapi<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  // Management API caps at 6 req/s; ~5/s keeps us comfortably under.
  await sleep(220);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: PAT as string, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${responseText.slice(0, 300)}`);
  }
  return (responseText ? JSON.parse(responseText) : {}) as T;
}

// ─── Field helpers ──────────────────────────────────────────────────────────
const text = (translatable = false) => ({ type: "text", translatable });
const area = (translatable = true) => ({ type: "textarea", translatable });
const asset = () => ({ type: "asset", filetypes: ["images"] });
const bloks = (whitelist: string[]) => ({
  type: "bloks",
  restrict_components: true,
  component_whitelist: whitelist,
});
const opt = (values: string[]) => ({
  type: "option",
  source: "internal",
  options: values.map((v) => ({ name: v, value: v })),
});
const opts = (values: string[]) => ({
  type: "options",
  source: "internal",
  options: values.map((v) => ({ name: v, value: v })),
});

interface CompDef {
  name: string;
  is_root: boolean;
  is_nestable: boolean;
  schema: Record<string, unknown>;
}

const COMPONENTS: CompDef[] = [
  {
    name: "page",
    is_root: true,
    is_nestable: false,
    schema: {
      body: bloks([
        "site_nav",
        "hero",
        "feature_grid",
        "how_it_works",
        "recipe_showcase",
        "testimonial_section",
        "faq_section",
        "cta_section",
        "site_footer",
      ]),
    },
  },
  {
    name: "site_nav",
    is_root: false,
    is_nestable: true,
    schema: { ctaLabel: text(true), ctaHref: text() },
  },
  {
    name: "hero",
    is_root: false,
    is_nestable: true,
    schema: {
      eyebrow: text(true),
      headline: text(true),
      subcopy: area(),
      ctaLabel: text(true),
      ctaHref: text(),
      reassurance: text(true),
      image: asset(),
    },
  },
  {
    name: "feature_item",
    is_root: false,
    is_nestable: true,
    schema: { icon: opt(["vet", "portion", "delivery"]), title: text(true), body: area() },
  },
  {
    name: "feature_grid",
    is_root: false,
    is_nestable: true,
    schema: { heading: text(true), items: bloks(["feature_item"]) },
  },
  {
    name: "how_step",
    is_root: false,
    is_nestable: true,
    schema: { title: text(true), body: area() },
  },
  {
    name: "how_it_works",
    is_root: false,
    is_nestable: true,
    schema: { eyebrow: text(true), heading: text(true), steps: bloks(["how_step"]) },
  },
  {
    name: "recipe_showcase",
    is_root: false,
    is_nestable: true,
    schema: { eyebrow: text(true), heading: text(true), subcopy: area() },
  },
  {
    name: "testimonial_item",
    is_root: false,
    is_nestable: true,
    schema: { quote: area(), attribution: text() },
  },
  {
    name: "testimonial_section",
    is_root: false,
    is_nestable: true,
    schema: { eyebrow: text(true), items: bloks(["testimonial_item"]) },
  },
  {
    name: "faq_item",
    is_root: false,
    is_nestable: true,
    schema: { question: text(true), answer: area() },
  },
  {
    name: "faq_section",
    is_root: false,
    is_nestable: true,
    schema: { heading: text(true), items: bloks(["faq_item"]) },
  },
  {
    name: "cta_section",
    is_root: false,
    is_nestable: true,
    schema: { heading: text(true), subcopy: area(), ctaLabel: text(true), ctaHref: text() },
  },
  {
    name: "footer_link",
    is_root: false,
    is_nestable: true,
    schema: { label: text(true), href: text() },
  },
  {
    name: "footer_column",
    is_root: false,
    is_nestable: true,
    schema: { heading: text(true), links: bloks(["footer_link"]) },
  },
  {
    name: "site_footer",
    is_root: false,
    is_nestable: true,
    schema: { columns: bloks(["footer_column"]), legal: area() },
  },
  {
    name: "recipe",
    is_root: true,
    is_nestable: true,
    schema: {
      name: text(true),
      slug: text(),
      description: area(),
      image: asset(),
      dietaryTags: opts(["GRAIN_FREE", "CHICKEN_FREE", "SENSITIVE"]),
    },
  },
];

async function upsertComponents() {
  const existing = (
    await mapi<{ components: { id: number; name: string }[] }>("GET", "/components/")
  ).components;
  const byName = new Map(existing.map((c) => [c.name, c.id]));
  for (const def of COMPONENTS) {
    const payload = {
      component: {
        name: def.name,
        display_name: def.name,
        is_root: def.is_root,
        is_nestable: def.is_nestable,
        schema: def.schema,
      },
    };
    const id = byName.get(def.name);
    if (id) {
      await mapi("PUT", `/components/${id}`, payload);
      console.log(`  ↻ component ${def.name}`);
    } else {
      await mapi("POST", "/components/", payload);
      console.log(`  + component ${def.name}`);
    }
  }
}

// ─── i18n merge: walk en + de blok trees in parallel, add `key__i18n__de` ─────
const NON_TRANSLATABLE = new Set([
  "_uid",
  "component",
  "ctaHref",
  "href",
  "slug",
  "icon",
  "dietaryTags",
]);

function isRecord(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeI18n(en: Json, de: Json): Json {
  if (Array.isArray(en)) {
    const deArr = Array.isArray(de) ? de : [];
    return en.map((item, i) => mergeI18n(item, deArr[i] ?? null));
  }
  if (isRecord(en)) {
    const deRec = isRecord(de) ? de : {};
    const out: { [key: string]: Json } = {};
    for (const [key, value] of Object.entries(en)) {
      if (Array.isArray(value) || isRecord(value)) {
        out[key] = mergeI18n(value, deRec[key] ?? null);
      } else {
        out[key] = value;
        const deValue = deRec[key];
        if (
          typeof value === "string" &&
          !NON_TRANSLATABLE.has(key) &&
          typeof deValue === "string" &&
          deValue !== value
        ) {
          out[`${key}__i18n__de`] = deValue;
        }
      }
    }
    return out;
  }
  return en;
}

async function upsertStory(slug: string, name: string, content: Json) {
  const found = (await mapi<{ stories: { id: number }[] }>("GET", `/stories?with_slug=${slug}`))
    .stories;
  const story = { name, slug, content };
  if (found.length) {
    await mapi("PUT", `/stories/${found[0].id}`, { story, publish: 1 });
    console.log(`  ↻ story ${slug} (published)`);
  } else {
    await mapi("POST", "/stories/", { story, publish: 1 });
    console.log(`  + story ${slug} (published)`);
  }
}

async function main() {
  console.log(`Provisioning space ${SPACE_ID}…`);
  console.log("Components:");
  await upsertComponents();

  console.log("Stories:");
  const home = mergeI18n(
    homeFallbackContent("en") as unknown as Json,
    homeFallbackContent("de") as unknown as Json,
  );
  await upsertStory("home", "Home", home);

  const en = recipeFallback("en");
  const de = recipeFallback("de");
  for (const recipe of en) {
    const deRecipe = de.find((r) => r.slug === recipe.slug) ?? recipe;
    const content = mergeI18n(recipe as unknown as Json, deRecipe as unknown as Json);
    await upsertStory(recipe.slug, recipe.name, content);
  }

  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
