/**
 * @swagger
 * components:
 *   schemas:
 *     OrderHistoryItem:
 *       type: object
 *       required: [productId, productName, quantity, unitPrice]
 *       properties:
 *         productId:
 *           type: integer
 *         productName:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitPrice:
 *           type: number
 *     OrderHistory:
 *       type: object
 *       required: [orderId, branchId, orderDate, name, status, total, items]
 *       properties:
 *         orderId:
 *           type: integer
 *         branchId:
 *           type: integer
 *         orderDate:
 *           type: string
 *           format: date-time
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *         total:
 *           type: number
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderHistoryItem'
 */
export interface OrderHistoryItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderHistory {
  orderId: number;
  branchId: number;
  orderDate: string;
  name: string;
  description: string;
  status: string;
  total: number;
  items: OrderHistoryItem[];
}
