"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { getStatusColor, getPaymentStatusColor, formatDate, formatCurrency } from "@/lib/utils";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productName: string;
  productImage: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { customer } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    if (!customer) {
      router.push("/login");
      return;
    }

    fetch(`/api/orders?customerId=${customer.id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customer, router]);

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white">My Orders</h1>
          <p className="text-blue-100 mt-1">
            View and track all your orders
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-32 animate-pulse"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-8xl block mb-6">📦</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No orders yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start shopping to see your orders here
            </p>
            <Link
              href="/products"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in"
              >
                {/* Order Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() =>
                    setExpandedOrder(
                      expandedOrder === order.id ? null : order.id
                    )
                  }
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {order.orderNumber}
                        </h3>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}
                        >
                          {order.status.replace("_", " ").toUpperCase()}
                        </span>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}
                        >
                          {order.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.createdAt)} ·{" "}
                        {order.items.length} item
                        {order.items.length > 1 ? "s" : ""} ·{" "}
                        {order.paymentMethod.replace("_", " ").toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <Link
                        href={`/track?orderNumber=${order.orderNumber}`}
                        className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Track
                      </Link>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedOrder === order.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="border-t p-6 bg-gray-50 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Items */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Order Items
                        </h4>
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 bg-white p-3 rounded-xl"
                            >
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={item.productImage}
                                  alt={item.productName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {item.productName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Qty: {item.quantity} × ₹{item.unitPrice}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                ₹{item.totalPrice}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Shipping Address
                        </h4>
                        <div className="bg-white p-4 rounded-xl">
                          <p className="text-gray-700">
                            {order.shippingAddress}
                          </p>
                          <p className="text-gray-700">
                            {order.shippingCity}, {order.shippingState}{" "}
                            {order.shippingZip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
