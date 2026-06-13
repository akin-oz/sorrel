/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Allergen =
  | 'CHICKEN'
  | 'CHICKPEA'
  | 'DAIRY'
  | 'FISH'
  | 'GRAIN';

export type BoxFrequency =
  | 'EVERY_2_WEEKS'
  | 'EVERY_4_WEEKS';

export type CatInput = {
  /** Age in whole months. */
  ageMonths: number;
  allergies?: Array<Allergen>;
  dietaryProgram?: DietaryProgram | null | undefined;
  fussiness: Fussiness;
  name: string;
  neutered: boolean;
  /** Must be true when dietaryProgram requires veterinary confirmation: enforced in packages/domain, asserted in tests. */
  vetConfirmationAcknowledged?: boolean;
  /** Body weight in kilograms. */
  weightKg: number;
};

export type Currency =
  | 'GBP';

/** Structured feeding regimes, distinct from DietaryTag (marketing filters) and Allergen (exclusions). */
export type DietaryProgram =
  | 'NOVEL_PROTEIN'
  | 'PLANT_BASED'
  | 'RENAL_SUPPORT';

/** The seven wizard steps, in funnel order. */
export type FunnelStep =
  | 'CATS'
  | 'DELIVERY'
  | 'EMAIL'
  | 'PLAN'
  | 'PROFILE'
  | 'RECIPES'
  | 'SUMMARY';

export type Fussiness =
  | 'EATS_ANYTHING'
  | 'SELECTIVE'
  | 'VERY_FUSSY';

export type PlanInput = {
  cats: Array<CatInput>;
  frequency: BoxFrequency;
  recipeSlugs: Array<string>;
};

export type SaveFunnelDraftInput = {
  cats?: Array<CatInput> | null | undefined;
  deliveryDate?: string | null | undefined;
  email?: string | null | undefined;
  frequency?: BoxFrequency | null | undefined;
  /** Existing draft id to update; omit to create a new draft. */
  id?: string | number | null | undefined;
  recipeSlugs?: Array<string> | null | undefined;
  step: FunnelStep;
};

export type FunnelPlanFieldsFragment = { frequency: BoxFrequency, portionGramsPerDay: number, mealsPerBox: number, pricing: { perDay: { amountMinor: number, currency: Currency, formatted: string }, perBox: { amountMinor: number, currency: Currency, formatted: string }, firstBox: { amountMinor: number, currency: Currency, formatted: string } } };

export type FunnelDraftFieldsFragment = { id: string, step: FunnelStep, recipeSlugs: Array<string>, deliveryDate: string | null, frequency: BoxFrequency | null, email: string | null, updatedAt: string, plan: { frequency: BoxFrequency, portionGramsPerDay: number, mealsPerBox: number, pricing: { perDay: { amountMinor: number, currency: Currency, formatted: string }, perBox: { amountMinor: number, currency: Currency, formatted: string }, firstBox: { amountMinor: number, currency: Currency, formatted: string } } } | null };

export type SaveFunnelDraftMutationVariables = Exact<{
  input: SaveFunnelDraftInput;
}>;


export type SaveFunnelDraftMutation = { saveFunnelDraft: { id: string, step: FunnelStep, recipeSlugs: Array<string>, deliveryDate: string | null, frequency: BoxFrequency | null, email: string | null, updatedAt: string, plan: { frequency: BoxFrequency, portionGramsPerDay: number, mealsPerBox: number, pricing: { perDay: { amountMinor: number, currency: Currency, formatted: string }, perBox: { amountMinor: number, currency: Currency, formatted: string }, firstBox: { amountMinor: number, currency: Currency, formatted: string } } } | null } };

export type UpdateFunnelPlanMutationVariables = Exact<{
  draftId: string | number;
  input: PlanInput;
}>;


export type UpdateFunnelPlanMutation = { updateFunnelPlan: { id: string, step: FunnelStep, recipeSlugs: Array<string>, deliveryDate: string | null, frequency: BoxFrequency | null, email: string | null, updatedAt: string, plan: { frequency: BoxFrequency, portionGramsPerDay: number, mealsPerBox: number, pricing: { perDay: { amountMinor: number, currency: Currency, formatted: string }, perBox: { amountMinor: number, currency: Currency, formatted: string }, firstBox: { amountMinor: number, currency: Currency, formatted: string } } } | null } };

export type FunnelDraftByIdQueryVariables = Exact<{
  id: string | number;
}>;


export type FunnelDraftByIdQuery = { funnelDraft: { id: string, step: FunnelStep, recipeSlugs: Array<string>, deliveryDate: string | null, frequency: BoxFrequency | null, email: string | null, updatedAt: string, plan: { frequency: BoxFrequency, portionGramsPerDay: number, mealsPerBox: number, pricing: { perDay: { amountMinor: number, currency: Currency, formatted: string }, perBox: { amountMinor: number, currency: Currency, formatted: string }, firstBox: { amountMinor: number, currency: Currency, formatted: string } } } | null } | null };

export const FunnelPlanFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelPlanFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Plan"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"portionGramsPerDay"}},{"kind":"Field","name":{"kind":"Name","value":"mealsPerBox"}},{"kind":"Field","name":{"kind":"Name","value":"pricing"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"perDay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"perBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"firstBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}}]}}]}}]} as unknown as DocumentNode<FunnelPlanFieldsFragment, unknown>;
export const FunnelDraftFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FunnelDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"recipeSlugs"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryDate"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelPlanFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelPlanFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Plan"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"portionGramsPerDay"}},{"kind":"Field","name":{"kind":"Name","value":"mealsPerBox"}},{"kind":"Field","name":{"kind":"Name","value":"pricing"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"perDay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"perBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"firstBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}}]}}]}}]} as unknown as DocumentNode<FunnelDraftFieldsFragment, unknown>;
export const SaveFunnelDraftDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveFunnelDraft"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveFunnelDraftInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveFunnelDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelPlanFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Plan"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"portionGramsPerDay"}},{"kind":"Field","name":{"kind":"Name","value":"mealsPerBox"}},{"kind":"Field","name":{"kind":"Name","value":"pricing"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"perDay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"perBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"firstBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FunnelDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"recipeSlugs"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryDate"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelPlanFields"}}]}}]}}]} as unknown as DocumentNode<SaveFunnelDraftMutation, SaveFunnelDraftMutationVariables>;
export const UpdateFunnelPlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateFunnelPlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlanInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateFunnelPlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"draftId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"draftId"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelPlanFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Plan"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"portionGramsPerDay"}},{"kind":"Field","name":{"kind":"Name","value":"mealsPerBox"}},{"kind":"Field","name":{"kind":"Name","value":"pricing"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"perDay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"perBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"firstBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FunnelDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"recipeSlugs"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryDate"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelPlanFields"}}]}}]}}]} as unknown as DocumentNode<UpdateFunnelPlanMutation, UpdateFunnelPlanMutationVariables>;
export const FunnelDraftByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FunnelDraftById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"funnelDraft"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelDraftFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelPlanFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Plan"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"portionGramsPerDay"}},{"kind":"Field","name":{"kind":"Name","value":"mealsPerBox"}},{"kind":"Field","name":{"kind":"Name","value":"pricing"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"perDay"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"perBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}},{"kind":"Field","name":{"kind":"Name","value":"firstBox"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"amountMinor"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"formatted"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"FunnelDraftFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FunnelDraft"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"step"}},{"kind":"Field","name":{"kind":"Name","value":"recipeSlugs"}},{"kind":"Field","name":{"kind":"Name","value":"deliveryDate"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"FunnelPlanFields"}}]}}]}}]} as unknown as DocumentNode<FunnelDraftByIdQuery, FunnelDraftByIdQueryVariables>;