# Order History Agentic Loop

## Backlog Choice

Selected **Order history** from `assets/backlog.md`. The cart already persists orders and order details, so this feature extends the existing data model without adding a migration.

## Plan

1. Add a typed order-history response containing branch, order metadata, line items, and a calculated total.
2. Implement one parameterized repository join grouped by order to avoid N+1 detail queries.
3. Expose `GET /api/orders/history?branchId=...` with positive-integer validation and Swagger metadata.
4. Add a typed React order-history page with list selection, line-item details, totals, and an empty state.
5. Add focused API route tests and a Playwright flow that creates, selects, verifies, and cleans up an order.
6. Run the API tests, frontend lint/build, browser test, and a final correctness review.

## Implementation

- `src/api-ts/src/models/orderHistory.ts` defines the response types and Swagger schemas.
- `src/api-ts/src/repositories/ordersRepo.ts` joins orders, details, and products, groups rows, and calculates totals.
- `src/api-ts/src/routes/order.ts` validates `branchId` and exposes the history endpoint.
- `src/frontend/src/components/OrderHistory.tsx` renders the order list and selected line items.
- `src/frontend/src/App.tsx`, `Navigation.tsx`, and `Footer.tsx` expose `/orders`.

## Tests

- `src/api-ts/src/routes/orderHistory.test.ts`: verifies nested items, total calculation, and invalid branch validation.
- `src/frontend/tests/e2e/order-history.spec.ts`: creates a real API order, selects it in the UI, verifies its line item and total, then deletes it.
- Validation: `npx vitest run src/routes/orderHistory.test.ts`, `npm run lint`, `npm run build`, and the focused Playwright test all pass.

## Review

The review caught that empty draft cart orders were initially included in history. The repository query now uses inner joins so only orders with persisted line items appear. The browser test also initially assumed its new order would be selected automatically; it now explicitly selects the order, covering the required interaction rather than relying on ordering in shared test data.
