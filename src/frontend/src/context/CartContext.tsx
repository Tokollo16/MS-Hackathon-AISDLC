import axios from 'axios';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/config';

export interface CartProduct {
  productId: number;
  name: string;
  price: number;
  discount?: number;
  imgName: string;
}

export interface CartItem {
  orderDetailId: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  notes: string;
}

interface CartContextValue {
  items: CartItem[];
  total: number;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  addToCart: (product: CartProduct, quantity: number) => Promise<void>;
  updateQuantity: (item: CartItem, quantity: number) => Promise<void>;
  removeFromCart: (item: CartItem) => Promise<void>;
}

const CART_ORDER_ID_KEY = 'octocat-cart-order-id';
const CartContext = createContext<CartContextValue | null>(null);

const getStoredOrderId = (): number | null => {
  const value = Number(window.localStorage.getItem(CART_ORDER_ID_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
};

const getCartItems = async (orderId: number): Promise<CartItem[]> => {
  const { data } = await axios.get<CartItem[]>(`${api.baseURL}${api.endpoints.orderDetails}`);
  return data.filter((item) => item.orderId === orderId);
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [orderId, setOrderId] = useState<number | null>(getStoredOrderId);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async (currentOrderId: number | null = orderId) => {
    if (!currentOrderId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setItems(await getCartItems(currentOrderId));
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 404) {
        window.localStorage.removeItem(CART_ORDER_ID_KEY);
        setOrderId(null);
        setItems([]);
      } else {
        setError('Unable to load your cart.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const ensureOrder = async (): Promise<number> => {
    if (orderId) {
      return orderId;
    }

    const { data } = await axios.post<{ orderId: number }>(`${api.baseURL}${api.endpoints.orders}`, {
      branchId: 1,
      orderDate: new Date().toISOString(),
      name: 'Shopping cart',
      description: 'Draft shopping cart',
      status: 'pending',
    });
    window.localStorage.setItem(CART_ORDER_ID_KEY, String(data.orderId));
    setOrderId(data.orderId);
    return data.orderId;
  };

  const runCartMutation = async (mutation: () => Promise<number | undefined>) => {
    try {
      setError(null);
      const updatedOrderId = await mutation();
      await refreshCart(updatedOrderId);
    } catch {
      setError('Unable to update your cart.');
      throw new Error('Cart update failed');
    }
  };

  const addToCart = async (product: CartProduct, quantity: number) => {
    if (quantity < 1) {
      return;
    }

    await runCartMutation(async () => {
      const currentOrderId = await ensureOrder();
      const currentItems = await getCartItems(currentOrderId);
      const existingItem = currentItems.find((item) => item.productId === product.productId);
      const unitPrice = product.price * (1 - (product.discount ?? 0));

      if (existingItem) {
        await axios.put(`${api.baseURL}${api.endpoints.orderDetails}/${existingItem.orderDetailId}`, {
          quantity: existingItem.quantity + quantity,
        });
      } else {
        await axios.post(`${api.baseURL}${api.endpoints.orderDetails}`, {
          orderId: currentOrderId,
          productId: product.productId,
          quantity,
          unitPrice,
          notes: '',
        });
      }
      return currentOrderId;
    });
  };

  const updateQuantity = async (item: CartItem, quantity: number) => {
    await runCartMutation(async () => {
      if (quantity < 1) {
        await axios.delete(`${api.baseURL}${api.endpoints.orderDetails}/${item.orderDetailId}`);
      } else {
        await axios.put(`${api.baseURL}${api.endpoints.orderDetails}/${item.orderDetailId}`, { quantity });
      }
      return item.orderId;
    });
  };

  const removeFromCart = async (item: CartItem) => updateQuantity(item, 0);

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, total, itemCount, isLoading, error, addToCart, updateQuantity, removeFromCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
