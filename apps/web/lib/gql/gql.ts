/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment FunnelPlanFields on Plan {\n    frequency\n    portionGramsPerDay\n    mealsPerBox\n    pricing {\n      perDay {\n        amountMinor\n        currency\n        formatted\n      }\n      perBox {\n        amountMinor\n        currency\n        formatted\n      }\n      firstBox {\n        amountMinor\n        currency\n        formatted\n      }\n    }\n  }\n": typeof types.FunnelPlanFieldsFragmentDoc,
    "\n  fragment FunnelDraftFields on FunnelDraft {\n    id\n    step\n    recipeSlugs\n    deliveryDate\n    frequency\n    email\n    updatedAt\n    plan {\n      ...FunnelPlanFields\n    }\n  }\n": typeof types.FunnelDraftFieldsFragmentDoc,
    "\n  mutation SaveFunnelDraft($input: SaveFunnelDraftInput!) {\n    saveFunnelDraft(input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n": typeof types.SaveFunnelDraftDocument,
    "\n  mutation UpdateFunnelPlan($draftId: ID!, $input: PlanInput!) {\n    updateFunnelPlan(draftId: $draftId, input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n": typeof types.UpdateFunnelPlanDocument,
    "\n  query FunnelDraftById($id: ID!) {\n    funnelDraft(id: $id) {\n      ...FunnelDraftFields\n    }\n  }\n": typeof types.FunnelDraftByIdDocument,
};
const documents: Documents = {
    "\n  fragment FunnelPlanFields on Plan {\n    frequency\n    portionGramsPerDay\n    mealsPerBox\n    pricing {\n      perDay {\n        amountMinor\n        currency\n        formatted\n      }\n      perBox {\n        amountMinor\n        currency\n        formatted\n      }\n      firstBox {\n        amountMinor\n        currency\n        formatted\n      }\n    }\n  }\n": types.FunnelPlanFieldsFragmentDoc,
    "\n  fragment FunnelDraftFields on FunnelDraft {\n    id\n    step\n    recipeSlugs\n    deliveryDate\n    frequency\n    email\n    updatedAt\n    plan {\n      ...FunnelPlanFields\n    }\n  }\n": types.FunnelDraftFieldsFragmentDoc,
    "\n  mutation SaveFunnelDraft($input: SaveFunnelDraftInput!) {\n    saveFunnelDraft(input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n": types.SaveFunnelDraftDocument,
    "\n  mutation UpdateFunnelPlan($draftId: ID!, $input: PlanInput!) {\n    updateFunnelPlan(draftId: $draftId, input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n": types.UpdateFunnelPlanDocument,
    "\n  query FunnelDraftById($id: ID!) {\n    funnelDraft(id: $id) {\n      ...FunnelDraftFields\n    }\n  }\n": types.FunnelDraftByIdDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FunnelPlanFields on Plan {\n    frequency\n    portionGramsPerDay\n    mealsPerBox\n    pricing {\n      perDay {\n        amountMinor\n        currency\n        formatted\n      }\n      perBox {\n        amountMinor\n        currency\n        formatted\n      }\n      firstBox {\n        amountMinor\n        currency\n        formatted\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment FunnelPlanFields on Plan {\n    frequency\n    portionGramsPerDay\n    mealsPerBox\n    pricing {\n      perDay {\n        amountMinor\n        currency\n        formatted\n      }\n      perBox {\n        amountMinor\n        currency\n        formatted\n      }\n      firstBox {\n        amountMinor\n        currency\n        formatted\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FunnelDraftFields on FunnelDraft {\n    id\n    step\n    recipeSlugs\n    deliveryDate\n    frequency\n    email\n    updatedAt\n    plan {\n      ...FunnelPlanFields\n    }\n  }\n"): (typeof documents)["\n  fragment FunnelDraftFields on FunnelDraft {\n    id\n    step\n    recipeSlugs\n    deliveryDate\n    frequency\n    email\n    updatedAt\n    plan {\n      ...FunnelPlanFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SaveFunnelDraft($input: SaveFunnelDraftInput!) {\n    saveFunnelDraft(input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n"): (typeof documents)["\n  mutation SaveFunnelDraft($input: SaveFunnelDraftInput!) {\n    saveFunnelDraft(input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateFunnelPlan($draftId: ID!, $input: PlanInput!) {\n    updateFunnelPlan(draftId: $draftId, input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateFunnelPlan($draftId: ID!, $input: PlanInput!) {\n    updateFunnelPlan(draftId: $draftId, input: $input) {\n      ...FunnelDraftFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FunnelDraftById($id: ID!) {\n    funnelDraft(id: $id) {\n      ...FunnelDraftFields\n    }\n  }\n"): (typeof documents)["\n  query FunnelDraftById($id: ID!) {\n    funnelDraft(id: $id) {\n      ...FunnelDraftFields\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;