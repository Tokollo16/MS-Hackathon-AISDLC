import { expect, test } from '@playwright/test';

test.describe('Persisted cart', () => {
  test('renders persisted items and updates the total', async ({ page }) => {
    const orderResponse = await page.request.post('http://localhost:3000/api/orders', {
      data: {
        branchId: 1,
        orderDate: '2026-09-22T11:00:00.000Z',
        name: 'Playwright cart',
        description: 'Cart E2E test',
        status: 'pending',
      },
    });
    expect(orderResponse.ok()).toBe(true);
    const order = await orderResponse.json();

    const detailResponse = await page.request.post('http://localhost:3000/api/order-details', {
      data: {
        orderId: order.orderId,
        productId: 1,
        quantity: 2,
        unitPrice: 25,
        notes: '',
      },
    });
    expect(detailResponse.ok()).toBe(true);

    try {
      await page.goto('/');
      await page.evaluate((orderId) => localStorage.setItem('octocat-cart-order-id', String(orderId)), order.orderId);
      await page.goto('/cart');

      await expect(page.getByRole('heading', { name: 'My Cart' })).toBeVisible();
      await expect(page.getByText('$50.00').last()).toBeVisible();
      await page.getByRole('button', { name: /Increase quantity of SmartFeeder One/ }).click();
      await expect(page.getByText('$75.00').last()).toBeVisible();
      await page.getByRole('button', { name: /Remove SmartFeeder One from cart/ }).click();
      await expect(page.getByText('Your cart is empty.')).toBeVisible();
    } finally {
      await page.request.delete(`http://localhost:3000/api/orders/${order.orderId}`);
    }
  });
});
