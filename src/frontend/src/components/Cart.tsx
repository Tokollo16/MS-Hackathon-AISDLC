import axios from 'axios';
import { useQuery } from 'react-query';
import { api } from '../api/config';
import { CartProduct, useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

const fetchProducts = async (): Promise<CartProduct[]> => {
  const { data } = await axios.get<CartProduct[]>(`${api.baseURL}${api.endpoints.products}`);
  return data;
};

export default function Cart() {
  const { items, total, itemCount, isLoading, error, updateQuantity, removeFromCart } = useCart();
  const { data: products = [] } = useQuery('cart-products', fetchProducts);
  const { darkMode } = useTheme();
  const productById = new Map(products.map((product) => [product.productId, product]));

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-primary font-semibold uppercase tracking-wide text-sm">Your order</p>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'}`}>My Cart</h1>
          </div>
          <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {error && <p className="mb-4 text-red-500" role="alert">{error}</p>}
        {isLoading ? (
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading cart...</p>
        ) : items.length === 0 ? (
          <div className={`${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} rounded-lg p-10 text-center shadow-sm`}>
            Your cart is empty.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-4">
              {items.map((item) => {
                const product = productById.get(item.productId);
                return (
                  <div
                    key={item.orderDetailId}
                    className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm flex gap-4 items-center`}
                  >
                    {product && <img src={`/${product.imgName}`} alt={product.name} className="w-20 h-20 object-contain" />}
                    <div className="flex-grow">
                      <h2 className={`font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                        {product?.name ?? `Product ${item.productId}`}
                      </h2>
                      <p className="text-primary font-bold">${item.unitPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void updateQuantity(item, item.quantity - 1)}
                        className="w-8 h-8 rounded border border-gray-400"
                        aria-label={`Decrease quantity of ${product?.name ?? 'product'}`}
                      >
                        -
                      </button>
                      <span className={`${darkMode ? 'text-light' : 'text-gray-800'} w-6 text-center`}>{item.quantity}</span>
                      <button
                        onClick={() => void updateQuantity(item, item.quantity + 1)}
                        className="w-8 h-8 rounded border border-gray-400"
                        aria-label={`Increase quantity of ${product?.name ?? 'product'}`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => void removeFromCart(item)}
                      className="text-sm text-red-500 hover:text-red-700"
                      aria-label={`Remove ${product?.name ?? 'product'} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <aside className={`${darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800'} rounded-lg p-6 shadow-sm h-fit`}>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                type="button"
                disabled
                title="Checkout is not available yet"
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white opacity-60 cursor-not-allowed"
              >
                Checkout
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
