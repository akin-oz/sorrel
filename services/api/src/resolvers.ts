import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

import {
  BLOCKED_WEEKDAY_INDEXES,
  type CurrencyCode,
  DEFAULT_LEAD_DAYS,
  type BoxFrequency as DomainBoxFrequency,
  type Money as DomainMoney,
  computePlan as computeDomainPlan,
  earliestDeliverableDate,
  toIso,
} from "@sorrel/domain";

import {
  BoxFrequency,
  Currency,
  DietaryProgram,
  type FunnelDraft,
  type Money,
  type Plan,
  type PlanInput,
  type RecipeFilter,
  Resolvers,
  type SaveFunnelDraftInput,
  Weekday,
} from "./__generated__/resolvers";

// ─── Scalars ─────────────────────────────────────────────────────────────────

const DateScalar = new GraphQLScalarType({
  name: "Date",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? ast.value : null),
});

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? ast.value : null),
});

// ─── Domain constants ─────────────────────────────────────────────────────────

// Monday-first index (0=Mon…6=Sun) → GraphQL Weekday enum.
const INDEX_TO_WEEKDAY: ReadonlyArray<Weekday> = [
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
  Weekday.Sunday,
];

export const blockedWeekdays: Weekday[] = [...BLOCKED_WEEKDAY_INDEXES]
  .sort((a, b) => a - b)
  .map((idx) => INDEX_TO_WEEKDAY[idx]);

// ─── Static seed data ─────────────────────────────────────────────────────────

const RECIPES = [
  {
    id: "1",
    slug: "wild-caught-salmon",
    name: "Wild-Caught Salmon",
    description: "Rich in omega-3s, gently cooked with peas and carrots.",
    dietaryTags: [] as [],
    imageUrl: null,
    available: true,
    suitablePrograms: [] as [],
  },
  {
    id: "2",
    slug: "free-range-chicken",
    name: "Free-Range Chicken",
    description: "Tender chicken breast with sweet potato and green beans.",
    dietaryTags: [] as [],
    imageUrl: null,
    available: true,
    suitablePrograms: [] as [],
  },
  {
    id: "3",
    slug: "duck-and-pumpkin",
    name: "Duck & Pumpkin",
    description: "Novel-protein duck with pumpkin — ideal for sensitive cats.",
    dietaryTags: [] as [],
    imageUrl: null,
    available: true,
    suitablePrograms: [DietaryProgram.NovelProtein],
  },
  {
    id: "4",
    slug: "renal-white-fish",
    name: "Renal White Fish",
    description: "Low-phosphorus white fish blend, formulated for renal support.",
    dietaryTags: [] as [],
    imageUrl: null,
    available: true,
    suitablePrograms: [DietaryProgram.RenalSupport],
  },
];

export const DIETARY_PROGRAMS = [
  {
    program: DietaryProgram.NovelProtein,
    name: "Novel Protein",
    requiresVetConfirmation: false,
    description: "Single novel protein source for cats with food sensitivities.",
  },
  {
    program: DietaryProgram.RenalSupport,
    name: "Renal Support",
    requiresVetConfirmation: true,
    description: "Restricted phosphorus and protein for cats with kidney disease.",
  },
  {
    program: DietaryProgram.PlantBased,
    name: "Plant-Based",
    requiresVetConfirmation: true,
    description: "Nutritionally complete plant-based formula — vet supervision required.",
  },
];

// ─── Domain ⇄ GraphQL boundary ──────────────────────────────────────────────
//
// Pricing, portion calc, and plan invariants live in `@sorrel/domain` (the
// source of truth). The resolver only translates the domain's string-union
// enums onto the generated GraphQL enums — it never re-implements the maths.

const FREQUENCY_TO_DOMAIN: Record<BoxFrequency, DomainBoxFrequency> = {
  [BoxFrequency.Every_2Weeks]: "EVERY_2_WEEKS",
  [BoxFrequency.Every_4Weeks]: "EVERY_4_WEEKS",
};

const FREQUENCY_TO_GRAPHQL: Record<DomainBoxFrequency, BoxFrequency> = {
  EVERY_2_WEEKS: BoxFrequency.Every_2Weeks,
  EVERY_4_WEEKS: BoxFrequency.Every_4Weeks,
};

const CURRENCY_TO_GRAPHQL: Record<CurrencyCode, Currency> = {
  GBP: Currency.Gbp,
};

function toGraphQLMoney(m: DomainMoney): Money {
  return {
    amountMinor: m.amountMinor,
    currency: CURRENCY_TO_GRAPHQL[m.currency],
    formatted: m.formatted,
  };
}

/**
 * Spec 044 §1: `todayIso` is injectable so the resolver test can pin a date
 * instead of double-reading `new Date()` (which crossed a midnight boundary
 * very rarely and reds CI). Production callers omit the arg and get today.
 */
export function computeDeliveryEstimate(todayIso: string = toIso(new Date())) {
  const earliest = earliestDeliverableDate(todayIso);
  return { earliest, blockedWeekdays, leadDays: DEFAULT_LEAD_DAYS };
}

/**
 * The minimal shape `computePlan` needs — body weight per cat plus a cadence.
 * Satisfied by both `PlanInput` (the query/mutation arg) and a stored
 * `FunnelDraft` (the `FunnelDraft.plan` field resolver), so neither has to be
 * reshaped at the call site.
 */
interface PlanComputeInput {
  cats: ReadonlyArray<{ weightKg: number }>;
  frequency: BoxFrequency;
}

export function computePlan(input: PlanComputeInput): Plan {
  const plan = computeDomainPlan({
    cats: input.cats.map((c) => ({ weightKg: c.weightKg })),
    frequency: FREQUENCY_TO_DOMAIN[input.frequency],
  });
  return {
    frequency: FREQUENCY_TO_GRAPHQL[plan.frequency],
    portionGramsPerDay: plan.portionGramsPerDay,
    mealsPerBox: plan.mealsPerBox,
    pricing: {
      perDay: toGraphQLMoney(plan.pricing.perDay),
      perBox: toGraphQLMoney(plan.pricing.perBox),
      firstBox: toGraphQLMoney(plan.pricing.firstBox),
    },
  };
}

export function filterRecipes(filter?: RecipeFilter | null) {
  const program = filter?.program;
  if (program) return RECIPES.filter((r) => r.suitablePrograms.includes(program));
  return RECIPES;
}

// ─── Draft store ──────────────────────────────────────────────────────────────

// Mock draft store: process-local Map keyed by server-minted UUID. No owner
// check; relies on UUID unguessability. Not productionizable as-is — a real
// backend needs auth, ownership, persistence, and PII-retention bounds.
const drafts = new Map<string, FunnelDraft>();

/** Spec 044: reset the in-memory draft store between tests to prevent cross-test contamination. */
export function clearDrafts(): void {
  drafts.clear();
}

// Spec 041 §2: input length caps. Bounded only by Next.js body-size upstream
// without these; reject explicit known-bad shapes at the resolver edge.
const MAX_EMAIL = 254; // RFC 5321
const MAX_NAME = 80;
const MAX_CATS = 20;
const MAX_RECIPE_SLUGS = 20;

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function validateDraftInput(input: {
  email?: string | null;
  cats?: ReadonlyArray<{ name: string }> | null;
  recipeSlugs?: ReadonlyArray<string> | null;
}): void {
  if (input.email != null && input.email.length > MAX_EMAIL) badInput("email too long");
  if (input.cats) {
    if (input.cats.length > MAX_CATS) badInput("too many cats");
    for (const cat of input.cats) {
      if (cat.name.length > MAX_NAME) badInput("cat name too long");
    }
  }
  if (input.recipeSlugs && input.recipeSlugs.length > MAX_RECIPE_SLUGS) {
    badInput("too many recipe slugs");
  }
}

export function getDraft(id: string): FunnelDraft | null {
  return drafts.get(id) ?? null;
}

export function saveDraft(input: SaveFunnelDraftInput): FunnelDraft {
  validateDraftInput(input);
  const id = input.id ?? crypto.randomUUID();
  const existing = input.id ? drafts.get(input.id) : undefined;

  const draft: FunnelDraft = {
    id,
    step: input.step,
    cats: existing?.cats ?? [],
    recipeSlugs: input.recipeSlugs ?? existing?.recipeSlugs ?? [],
    updatedAt: new Date().toISOString(),
  };

  if (input.deliveryDate !== undefined) draft.deliveryDate = input.deliveryDate;
  else if (existing?.deliveryDate !== undefined) draft.deliveryDate = existing.deliveryDate;

  if (input.frequency !== undefined) draft.frequency = input.frequency;
  else if (existing?.frequency !== undefined) draft.frequency = existing.frequency;

  if (input.email !== undefined) draft.email = input.email;
  else if (existing?.email !== undefined) draft.email = existing.email;

  if (input.cats) {
    draft.cats = input.cats.map((c, i) => ({
      id: `${id}-cat-${i}`,
      name: c.name,
      ageMonths: c.ageMonths,
      neutered: c.neutered,
      weightKg: c.weightKg,
      fussiness: c.fussiness,
      allergies: c.allergies ?? [],
      dietaryProgram: c.dietaryProgram ?? null,
      vetConfirmed: c.vetConfirmationAcknowledged ?? false,
    }));
  }

  drafts.set(id, draft);
  return draft;
}

export function updateDraft(draftId: string, input: PlanInput): FunnelDraft {
  validateDraftInput({ recipeSlugs: input.recipeSlugs });
  const existing = drafts.get(draftId);
  if (!existing) throw new Error(`Draft ${draftId} not found`);
  const updated: FunnelDraft = {
    ...existing,
    recipeSlugs: input.recipeSlugs,
    frequency: input.frequency,
    updatedAt: new Date().toISOString(),
  };
  drafts.set(draftId, updated);
  return updated;
}

/**
 * Derive a draft's plan from its current cats + frequency. Null until a
 * frequency is chosen (and there is at least one cat). Always recomputed,
 * never stored — a resumed draft can never surface a stale price.
 */
export function draftPlan(draft: Pick<FunnelDraft, "cats" | "frequency">): Plan | null {
  if (draft.frequency == null || draft.cats.length === 0) return null;
  return computePlan({ cats: draft.cats, frequency: draft.frequency });
}

// ─── Resolver wiring ──────────────────────────────────────────────────────────

export const resolvers: Resolvers = {
  Date: DateScalar,
  DateTime: DateTimeScalar,

  Query: {
    recipes: (_parent, args) => filterRecipes(args.filter),
    deliveryEstimate: () => computeDeliveryEstimate(),
    plan: (_parent, args) => computePlan(args.input),
    funnelDraft: (_parent, args) => getDraft(args.id),
    dietaryPrograms: () => DIETARY_PROGRAMS,
  },

  // `plan` is always derived from the draft's current cats + frequency — never
  // stored — so a resumed or just-updated draft can never carry a stale price.
  FunnelDraft: {
    plan: (draft) => draftPlan(draft),
  },

  Mutation: {
    saveFunnelDraft: (_parent, args) => saveDraft(args.input),
    updateFunnelPlan: (_parent, args) => updateDraft(args.draftId, args.input),
  },
};
