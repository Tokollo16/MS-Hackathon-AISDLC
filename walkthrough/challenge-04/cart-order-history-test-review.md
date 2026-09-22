# Cart and Order History Test Review

## Baseline

The existing suites were run before extending coverage:

- API: `npm test -- --run` — 3 files, 20 tests passed.
- Frontend: `npm test` with the existing Playwright Chromium project — 4 tests passed.

Only the repository's existing Vitest and Playwright tooling was used.

## Added Coverage

- `src/api-ts/src/routes/orderDetail.test.ts` adds cart line coverage for valid creation, zero quantity, negative quantity, fractional quantity, string quantity, and invalid updates.
- `src/api-ts/src/routes/orderHistory.test.ts` covers nested line items, calculated totals, and invalid branch IDs.
- `src/frontend/tests/e2e/cart.spec.ts` covers loading persisted cart data, recalculating the total after a quantity update, and removing the final item.
- `src/frontend/tests/e2e/order-history.spec.ts` covers creating an order, selecting it from the history list, viewing its line item, and verifying its total.

Final results:

- API: 4 files, 26 tests passed.
- Frontend: 5 Playwright tests passed.
- Frontend lint/build: passed.
- API build: passed.

## Review Findings Addressed

1. The order-detail repository singleton reused a closed SQLite connection between isolated tests. The test-aware factory now returns a fresh repository for Vitest/test mode, matching the existing orders repository pattern.
2. Cart quantities were not validated at the API boundary. Order-detail create/update now reject non-positive, fractional, and non-numeric quantities with the existing `ValidationError` response shape.
3. The order-history review had already excluded empty draft cart orders with inner joins and required the browser test to select its created order explicitly instead of relying on shared database ordering.

## Context Budget

The test-generation/review pass used a maximum of 8 files and approximately 220 lines per file:

1. Directly edited cart and order-history files first.
2. Adjacent route tests and Playwright configuration second.
3. Migration/schema files only when a test fixture's columns were unclear.
4. No architecture-document retrieval was needed.

This kept the generated tests aligned with local helpers and response shapes. The trade-off was less broad discovery of unrelated edge cases, but the resulting tests stayed focused on persistence, totals, validation, and error handling.

## Optional Model Comparison

Not run in this pass. No model-specific result is claimed. A practical decision rule for a future pass is to use Auto for initial test discovery and an explicitly selected model for a multi-file test plan when consistency of test fixtures and repository patterns matters more than speed.
