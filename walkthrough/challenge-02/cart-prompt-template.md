# Cart Prompt Template

Use this template when asking Copilot to implement or review a feature in this repository. Replace the bracketed values and attach only the files listed in the context order.

## Objective

Implement or review **[feature]** so that **[observable user outcomes]** are supported end to end.

## Constraints

- Follow the existing repository, model, DTO, routing, error-handling, and UI patterns.
- Keep the change type-safe and limited to the requested behavior.
- Persist state through the API; do not use client-only state as the source of truth.
- Preserve existing public APIs unless a new endpoint is required.
- Add or update focused tests for success, validation, persistence, and failure paths.
- Do not implement adjacent backlog work.

## Files In Scope

- Directly edited files: [list the target files]
- Adjacent tests: [list the nearest relevant test files]
- Architecture or API documentation: [only if a contract remains unclear]

## Context Retrieval Order

1. Read the directly edited files and their imported types/helpers.
2. Read adjacent tests or the nearest existing implementation of the same behavior.
3. Read architecture or integration documentation only if the contract is still unclear.
4. Stop retrieving context once the behavior, ownership boundary, and validation check are clear.

## Desired Output Format

1. State one local hypothesis about how the current code should change.
2. List the smallest file set to edit and why each file is needed.
3. Implement the change with a scoped diff.
4. Run the narrowest relevant validation command.
5. Report changed files, validation results, and any remaining risks.

## Cart Request

Apply the template to the shopping cart. A user must be able to add products, update quantities, remove items, see an accurate total, and retain cart state through the existing API patterns.

Use these files first:

- `src/frontend/src/components/entity/product/Products.tsx`
- `src/frontend/src/components/Cart.tsx`
- `src/frontend/src/context/CartContext.tsx`
- `src/frontend/src/api/config.ts`
- `src/api-ts/src/models/order.ts`
- `src/api-ts/src/models/orderDetail.ts`
- `src/api-ts/src/routes/order.ts`
- `src/api-ts/src/routes/orderDetail.ts`
- `src/api-ts/src/repositories/ordersRepo.ts`
- `src/api-ts/src/repositories/orderDetailsRepo.ts`

Then inspect the nearest route tests only if the endpoint behavior is unclear. Read architecture docs only if the persistence boundary cannot be established from those files.
