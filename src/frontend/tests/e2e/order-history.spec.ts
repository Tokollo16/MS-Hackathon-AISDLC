import { expect, test } from '@playwright/test';

test.describe('Order history', () => {
  test('lists an order and opens its line-item details', async ({ page }) => {
    const orderResponse = await page.request.post('http://localhost:3000/api/orders', {
      data: {
        branchId: 1,
        orderDate: '2026-09-22T10:00:00.000Z',
        name: 'Playwright order',
        description: 'Order history test',
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
      await page.goto('/orders');
      await expect(page.locator('h1')).toHaveText('Order History');
      const orderButton = page.getByRole('button', { name: /Playwright order/ });
      await expect(orderButton).toBeVisible();
      await orderButton.click();
      await expect(page.getByRole('heading', { name: 'Playwright order' })).toBeVisible();
      await expect(page.getByText('SmartFeeder One × 2')).toBeVisible();
      await expect(page.getByText('$50.00').first()).toBeVisible();
    } finally {
      await page.request.delete(`http://localhost:3000/api/orders/${order.orderId}`);
    }
  });
});
