import { graphql } from "../gql";

/**
 * Funnel GraphQL operations (spec 013). The single place network operations are
 * declared; `yarn codegen` turns each into a typed `TypedDocumentNode`, so the
 * wizard imports these and never hand-writes a variable or response type.
 *
 * The plan selection is shared via a fragment (fragment masking is off, so it
 * spreads inline into each operation's typed result).
 */
export const FunnelPlanFields = graphql(`
  fragment FunnelPlanFields on Plan {
    frequency
    portionGramsPerDay
    mealsPerBox
    pricing {
      perDay {
        amountMinor
        currency
        formatted
      }
      perBox {
        amountMinor
        currency
        formatted
      }
      firstBox {
        amountMinor
        currency
        formatted
      }
    }
  }
`);

export const FunnelDraftFields = graphql(`
  fragment FunnelDraftFields on FunnelDraft {
    id
    step
    recipeSlugs
    deliveryDate
    frequency
    email
    updatedAt
    plan {
      ...FunnelPlanFields
    }
  }
`);

/** Autosave the draft for abandonment recovery (optimistic on the client). */
export const SaveFunnelDraftDocument = graphql(`
  mutation SaveFunnelDraft($input: SaveFunnelDraftInput!) {
    saveFunnelDraft(input: $input) {
      ...FunnelDraftFields
    }
  }
`);

/** Recompute plan + price when the PLAN-step frequency changes. */
export const UpdateFunnelPlanDocument = graphql(`
  mutation UpdateFunnelPlan($draftId: ID!, $input: PlanInput!) {
    updateFunnelPlan(draftId: $draftId, input: $input) {
      ...FunnelDraftFields
    }
  }
`);

/** Resume a draft mid-funnel. */
export const FunnelDraftByIdDocument = graphql(`
  query FunnelDraftById($id: ID!) {
    funnelDraft(id: $id) {
      ...FunnelDraftFields
    }
  }
`);
