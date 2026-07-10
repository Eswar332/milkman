"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/context/StoreContext";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal, customer } =
    useStore();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-8xl block mb-6">🛒</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Add some delicious dairy products to get started!
          </p>
          <Link
            href="/products"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
          <p className="text-blue-100 mt-1">
            {cart.length} item{cart.length > 1 ? "s" : ""} in your cart
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-white rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-gray-100 shadow-sm animate-fade-in"
              >
                <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.product.unit} · {item.product.category}
                  </p>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    ₹{item.product.price}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition"
                  >
                    −
                  </button>
                  <span className="font-semibold text-lg w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    ₹{(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-500 hover:text-red-700 text-sm mt-1 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>₹{(cartTotal * 0.05).toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg text-gray-900">
                  <span>Total</span>
                  <span>₹{(cartTotal * 1.05).toFixed(2)}</span>
                </div>
              </div>

              {customer ? (
                <Link
                  href="/checkout"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-semibold text-lg transition"
                >
                  Proceed to Checkout
                </Link>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-semibold transition"
                  >
                    Login to Checkout
                  </Link>
                  <p className="text-center text-sm text-gray-500">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/register"
                      className="text-blue-600 hover:underline"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              )}

              <Link
                href="/products"
                className="block w-full text-center text-blue-600 hover:text-blue-800 mt-4 font-medium"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
