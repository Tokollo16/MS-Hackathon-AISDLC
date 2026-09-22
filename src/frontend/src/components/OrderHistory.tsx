import axios from 'axios';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../api/config';
import { useTheme } from '../context/ThemeContext';

interface OrderHistoryItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderHistoryRecord {
  orderId: number;
  branchId: number;
  orderDate: string;
  name: string;
  description: string;
  status: string;
  total: number;
  items: OrderHistoryItem[];
}

const fetchOrderHistory = async (): Promise<OrderHistoryRecord[]> => {
  const { data } = await axios.get<OrderHistoryRecord[]>(`${api.baseURL}${api.endpoints.orders}/history?branchId=1`);
  return data;
};

export default function OrderHistory() {
  const { darkMode } = useTheme();
  const { data: orders = [], isLoading, error } = useQuery('order-history', fetchOrderHistory);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) ?? orders[0];

  if (isLoading) {
    return <div className={`min-h-screen ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-800'} pt-20 px-4`}>Loading order history...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-100 pt-20 px-4 text-red-500" role="alert">Failed to load order history.</div>;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4`}>
      <div className="max-w-6xl mx-auto">
        <p className="text-primary font-semibold uppercase tracking-wide text-sm">Account</p>
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-light' : 'text-gray-800'}`}>Order History</h1>

        {orders.length === 0 ? (
          <div className={`${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} rounded-lg p-10 text-center shadow-sm`} role="status">
            No orders yet.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
            <div className="space-y-3" aria-label="Order list">
              {orders.map((order) => (
                <button
                  key={order.orderId}
                  type="button"
                  onClick={() => setSelectedOrderId(order.orderId)}
                  className={`w-full text-left rounded-lg p-4 shadow-sm border-2 transition-colors ${selectedOrder?.orderId === order.orderId
                    ? 'border-primary'
                    : `${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-transparent'}`}`}
                >
                  <div className="flex justify-between gap-3">
                    <span className={`font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>{order.name}</span>
                    <span className="text-primary font-bold">${order.total.toFixed(2)}</span>
                  </div>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-2`}>
                    {new Date(order.orderDate).toLocaleDateString()} · {order.status}
                  </p>
                </button>
              ))}
            </div>

            {selectedOrder && (
              <section className={`${darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800'} rounded-lg p-6 shadow-sm`} aria-label="Selected order details">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedOrder.name}</h2>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                      {new Date(selectedOrder.orderDate).toLocaleString()} · {selectedOrder.status}
                    </p>
                  </div>
                  <span className="text-primary text-xl font-bold">${selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="divide-y divide-gray-300/30">
                  {selectedOrder.items.map((item) => (
                    <div key={item.productId} className="py-3 flex justify-between gap-4">
                      <span>{item.productName} × {item.quantity}</span>
                      <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
