import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** An ISO-8601 calendar date: YYYY-MM-DD (no time, no timezone). */
  Date: { input: unknown; output: unknown; }
  /** An ISO-8601 timestamp with timezone, e.g. 2026-06-12T11:35:50Z. */
  DateTime: { input: unknown; output: unknown; }
};

export enum Allergen {
  Chicken = 'CHICKEN',
  Chickpea = 'CHICKPEA',
  Dairy = 'DAIRY',
  Fish = 'FISH',
  Grain = 'GRAIN'
}

export enum BoxFrequency {
  Every_2Weeks = 'EVERY_2_WEEKS',
  Every_4Weeks = 'EVERY_4_WEEKS'
}

export type Cat = {
  __typename?: 'Cat';
  /** Age in whole months. */
  ageMonths: Scalars['Int']['output'];
  allergies: Array<Allergen>;
  /** Structured feeding regime, if any. Most cats have none. */
  dietaryProgram?: Maybe<DietaryProgram>;
  fussiness: Fussiness;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  neutered: Scalars['Boolean']['output'];
  vetConfirmed: Scalars['Boolean']['output'];
  /** Body weight in kilograms. */
  weightKg: Scalars['Float']['output'];
};

export type CatInput = {
  /** Age in whole months. */
  ageMonths: Scalars['Int']['input'];
  allergies?: Array<Allergen>;
  dietaryProgram?: InputMaybe<DietaryProgram>;
  fussiness: Fussiness;
  name: Scalars['String']['input'];
  neutered: Scalars['Boolean']['input'];
  /** Must be true when dietaryProgram requires veterinary confirmation: enforced in packages/domain, asserted in tests. */
  vetConfirmationAcknowledged?: Scalars['Boolean']['input'];
  /** Body weight in kilograms. */
  weightKg: Scalars['Float']['input'];
};

export enum Currency {
  Gbp = 'GBP'
}

/** The delivery availability the picker renders — mirrors the packages/domain rules. */
export type DeliveryEstimate = {
  __typename?: 'DeliveryEstimate';
  /** Weekdays on which delivery never runs. */
  blockedWeekdays: Array<Weekday>;
  /** Earliest deliverable date; the picker pre-selects this. */
  earliest: Scalars['Date']['output'];
  /** Minimum days from today before the earliest deliverable date. */
  leadDays: Scalars['Int']['output'];
};

/** Structured feeding regimes, distinct from DietaryTag (marketing filters) and Allergen (exclusions). */
export enum DietaryProgram {
  NovelProtein = 'NOVEL_PROTEIN',
  PlantBased = 'PLANT_BASED',
  RenalSupport = 'RENAL_SUPPORT'
}

export type DietaryProgramInfo = {
  __typename?: 'DietaryProgramInfo';
  description: Scalars['String']['output'];
  name: Scalars['String']['output'];
  program: DietaryProgram;
  /** True for clinical programs (RENAL_SUPPORT, PLANT_BASED): selecting one requires confirmed veterinary supervision. The domain layer rejects unconfirmed selections. */
  requiresVetConfirmation: Scalars['Boolean']['output'];
};

export enum DietaryTag {
  ChickenFree = 'CHICKEN_FREE',
  GrainFree = 'GRAIN_FREE',
  Sensitive = 'SENSITIVE'
}

/** Persisted funnel state for abandonment recovery (resume mid-funnel). */
export type FunnelDraft = {
  __typename?: 'FunnelDraft';
  cats: Array<Cat>;
  deliveryDate?: Maybe<Scalars['Date']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  frequency?: Maybe<BoxFrequency>;
  id: Scalars['ID']['output'];
  recipeSlugs: Array<Scalars['String']['output']>;
  step: FunnelStep;
  /** When the draft was last saved. */
  updatedAt: Scalars['DateTime']['output'];
};

/** The seven wizard steps, in funnel order. */
export enum FunnelStep {
  Cats = 'CATS',
  Delivery = 'DELIVERY',
  Email = 'EMAIL',
  Plan = 'PLAN',
  Profile = 'PROFILE',
  Recipes = 'RECIPES',
  Summary = 'SUMMARY'
}

export enum Fussiness {
  EatsAnything = 'EATS_ANYTHING',
  Selective = 'SELECTIVE',
  VeryFussy = 'VERY_FUSSY'
}

/** A monetary amount in minor units (pence) — never a float, to avoid rounding drift. */
export type Money = {
  __typename?: 'Money';
  /** Amount in the currency's minor unit; 2408 means £24.08. */
  amountMinor: Scalars['Int']['output'];
  currency: Currency;
  /** Display string including the currency symbol, e.g. £24.08. */
  formatted: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Autosave for abandonment recovery — driven optimistically from the client. */
  saveFunnelDraft: FunnelDraft;
  /** Recompute plan + price on frequency/recipe change (optimistic preview). */
  updateFunnelPlan: FunnelDraft;
};


export type MutationSaveFunnelDraftArgs = {
  input: SaveFunnelDraftInput;
};


export type MutationUpdateFunnelPlanArgs = {
  draftId: Scalars['ID']['input'];
  input: PlanInput;
};

export type Plan = {
  __typename?: 'Plan';
  frequency: BoxFrequency;
  mealsPerBox: Scalars['Int']['output'];
  /** Daily food portion in grams (from the packages/domain portion calc). */
  portionGramsPerDay: Scalars['Int']['output'];
  pricing: Pricing;
};

export type PlanInput = {
  cats: Array<CatInput>;
  frequency: BoxFrequency;
  recipeSlugs: Array<Scalars['String']['input']>;
};

export type Pricing = {
  __typename?: 'Pricing';
  firstBox: Money;
  perBox: Money;
  perDay: Money;
};

export type Query = {
  __typename?: 'Query';
  /** Earliest delivery date + blocked weekdays for the picker. */
  deliveryEstimate: DeliveryEstimate;
  /** Program catalog, including which programs carry the veterinary gate. */
  dietaryPrograms: Array<DietaryProgramInfo>;
  funnelDraft?: Maybe<FunnelDraft>;
  plan: Plan;
  recipes: Array<Recipe>;
};


export type QueryDeliveryEstimateArgs = {
  postcode?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFunnelDraftArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlanArgs = {
  input: PlanInput;
};


export type QueryRecipesArgs = {
  filter?: InputMaybe<RecipeFilter>;
};

export type Recipe = {
  __typename?: 'Recipe';
  available: Scalars['Boolean']['output'];
  description: Scalars['String']['output'];
  dietaryTags: Array<DietaryTag>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** Stable identifier referenced by recipeSlugs across the funnel, e.g. wild-caught-salmon. */
  slug: Scalars['String']['output'];
  /** Programs this recipe is formulated for. Empty for standard recipes. */
  suitablePrograms: Array<DietaryProgram>;
};

export type RecipeFilter = {
  dietaryTags?: InputMaybe<Array<DietaryTag>>;
  excludeAllergens?: InputMaybe<Array<Allergen>>;
  program?: InputMaybe<DietaryProgram>;
};

export type SaveFunnelDraftInput = {
  cats?: InputMaybe<Array<CatInput>>;
  deliveryDate?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  frequency?: InputMaybe<BoxFrequency>;
  /** Existing draft id to update; omit to create a new draft. */
  id?: InputMaybe<Scalars['ID']['input']>;
  recipeSlugs?: InputMaybe<Array<Scalars['String']['input']>>;
  step: FunnelStep;
};

export enum Weekday {
  Friday = 'FRIDAY',
  Monday = 'MONDAY',
  Saturday = 'SATURDAY',
  Sunday = 'SUNDAY',
  Thursday = 'THURSDAY',
  Tuesday = 'TUESDAY',
  Wednesday = 'WEDNESDAY'
}



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Allergen: Allergen;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BoxFrequency: BoxFrequency;
  Cat: ResolverTypeWrapper<Cat>;
  CatInput: CatInput;
  Currency: Currency;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeliveryEstimate: ResolverTypeWrapper<DeliveryEstimate>;
  DietaryProgram: DietaryProgram;
  DietaryProgramInfo: ResolverTypeWrapper<DietaryProgramInfo>;
  DietaryTag: DietaryTag;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FunnelDraft: ResolverTypeWrapper<FunnelDraft>;
  FunnelStep: FunnelStep;
  Fussiness: Fussiness;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Money: ResolverTypeWrapper<Money>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Plan: ResolverTypeWrapper<Plan>;
  PlanInput: PlanInput;
  Pricing: ResolverTypeWrapper<Pricing>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Recipe: ResolverTypeWrapper<Recipe>;
  RecipeFilter: RecipeFilter;
  SaveFunnelDraftInput: SaveFunnelDraftInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Weekday: Weekday;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  Cat: Cat;
  CatInput: CatInput;
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DeliveryEstimate: DeliveryEstimate;
  DietaryProgramInfo: DietaryProgramInfo;
  Float: Scalars['Float']['output'];
  FunnelDraft: FunnelDraft;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Money: Money;
  Mutation: Record<PropertyKey, never>;
  Plan: Plan;
  PlanInput: PlanInput;
  Pricing: Pricing;
  Query: Record<PropertyKey, never>;
  Recipe: Recipe;
  RecipeFilter: RecipeFilter;
  SaveFunnelDraftInput: SaveFunnelDraftInput;
  String: Scalars['String']['output'];
};

export type CatResolvers<ContextType = any, ParentType extends ResolversParentTypes['Cat'] = ResolversParentTypes['Cat']> = {
  ageMonths?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  allergies?: Resolver<Array<ResolversTypes['Allergen']>, ParentType, ContextType>;
  dietaryProgram?: Resolver<Maybe<ResolversTypes['DietaryProgram']>, ParentType, ContextType>;
  fussiness?: Resolver<ResolversTypes['Fussiness'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  neutered?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  vetConfirmed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  weightKg?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeliveryEstimateResolvers<ContextType = any, ParentType extends ResolversParentTypes['DeliveryEstimate'] = ResolversParentTypes['DeliveryEstimate']> = {
  blockedWeekdays?: Resolver<Array<ResolversTypes['Weekday']>, ParentType, ContextType>;
  earliest?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  leadDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type DietaryProgramInfoResolvers<ContextType = any, ParentType extends ResolversParentTypes['DietaryProgramInfo'] = ResolversParentTypes['DietaryProgramInfo']> = {
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  program?: Resolver<ResolversTypes['DietaryProgram'], ParentType, ContextType>;
  requiresVetConfirmation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type FunnelDraftResolvers<ContextType = any, ParentType extends ResolversParentTypes['FunnelDraft'] = ResolversParentTypes['FunnelDraft']> = {
  cats?: Resolver<Array<ResolversTypes['Cat']>, ParentType, ContextType>;
  deliveryDate?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  frequency?: Resolver<Maybe<ResolversTypes['BoxFrequency']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  recipeSlugs?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  step?: Resolver<ResolversTypes['FunnelStep'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type MoneyResolvers<ContextType = any, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = {
  amountMinor?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['Currency'], ParentType, ContextType>;
  formatted?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  saveFunnelDraft?: Resolver<ResolversTypes['FunnelDraft'], ParentType, ContextType, RequireFields<MutationSaveFunnelDraftArgs, 'input'>>;
  updateFunnelPlan?: Resolver<ResolversTypes['FunnelDraft'], ParentType, ContextType, RequireFields<MutationUpdateFunnelPlanArgs, 'draftId' | 'input'>>;
};

export type PlanResolvers<ContextType = any, ParentType extends ResolversParentTypes['Plan'] = ResolversParentTypes['Plan']> = {
  frequency?: Resolver<ResolversTypes['BoxFrequency'], ParentType, ContextType>;
  mealsPerBox?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  portionGramsPerDay?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pricing?: Resolver<ResolversTypes['Pricing'], ParentType, ContextType>;
};

export type PricingResolvers<ContextType = any, ParentType extends ResolversParentTypes['Pricing'] = ResolversParentTypes['Pricing']> = {
  firstBox?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  perBox?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  perDay?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  deliveryEstimate?: Resolver<ResolversTypes['DeliveryEstimate'], ParentType, ContextType, Partial<QueryDeliveryEstimateArgs>>;
  dietaryPrograms?: Resolver<Array<ResolversTypes['DietaryProgramInfo']>, ParentType, ContextType>;
  funnelDraft?: Resolver<Maybe<ResolversTypes['FunnelDraft']>, ParentType, ContextType, RequireFields<QueryFunnelDraftArgs, 'id'>>;
  plan?: Resolver<ResolversTypes['Plan'], ParentType, ContextType, RequireFields<QueryPlanArgs, 'input'>>;
  recipes?: Resolver<Array<ResolversTypes['Recipe']>, ParentType, ContextType, Partial<QueryRecipesArgs>>;
};

export type RecipeResolvers<ContextType = any, ParentType extends ResolversParentTypes['Recipe'] = ResolversParentTypes['Recipe']> = {
  available?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dietaryTags?: Resolver<Array<ResolversTypes['DietaryTag']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  suitablePrograms?: Resolver<Array<ResolversTypes['DietaryProgram']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Cat?: CatResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DeliveryEstimate?: DeliveryEstimateResolvers<ContextType>;
  DietaryProgramInfo?: DietaryProgramInfoResolvers<ContextType>;
  FunnelDraft?: FunnelDraftResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Plan?: PlanResolvers<ContextType>;
  Pricing?: PricingResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Recipe?: RecipeResolvers<ContextType>;
};

