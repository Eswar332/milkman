"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getStatusColor, getPaymentStatusColor, formatDate, formatCurrency } from "@/lib/utils";

interface TrackingEntry {
  id: number;
  status: string;
  description: string;
  location: string | null;
  createdAt: string;
}

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productName: string;
  productImage: string;
}

interface TrackingOrder {
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
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItem[];
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [searchValue, setSearchValue] = useState(initialOrderNumber);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [tracking, setTracking] = useState<TrackingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialOrderNumber) {
      handleSearch(initialOrderNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (num?: string) => {
    const searchNum = num || searchValue;
    if (!searchNum.trim()) return;

    setLoading(true);
    setError("");
    setSearched(true);
    setOrderNumber(searchNum);

    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(searchNum.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Order not found");
        setOrder(null);
        setTracking([]);
        return;
      }

      setOrder(data.order);
      setTracking(data.tracking);
    } catch {
      setError("Failed to track order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = [
    { key: "pending", label: "Order Placed", icon: "📋" },
    { key: "confirmed", label: "Confirmed", icon: "✅" },
    { key: "processing", label: "Processing", icon: "⚙️" },
    { key: "shipped", label: "Shipped", icon: "📦" },
    { key: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
    { key: "delivered", label: "Delivered", icon: "🎉" },
  ];

  const getStepIndex = (status: string) => {
    const idx = statusSteps.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 1;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <span className="text-5xl block mb-4">📦</span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Track Your Order
          </h1>
          <p className="text-blue-100 mb-8">
            Enter your order number to see real-time status
          </p>

          <div className="flex gap-3 max-w-lg mx-auto">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border-0 rounded-xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-green-500 shadow-lg"
              placeholder="e.g. MLK-260115-A3B2C1"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg disabled:bg-green-400"
            >
              {loading ? "..." : "Track"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-center mb-8">
            <span className="text-4xl block mb-2">😔</span>
            <p className="font-semibold">{error}</p>
            <p className="text-sm text-red-500 mt-1">
              Please check the order number and try again
            </p>
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">🔍</span>
            <h3 className="text-xl font-semibold text-gray-700">
              Enter your order number above
            </h3>
            <p className="text-gray-500 mt-2">
              You can find it in your order confirmation email
            </p>
          </div>
        )}

        {order && (
          <div className="space-y-6 animate-fade-in">
            {/* Order Overview */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Order #{orderNumber}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                  <div className="flex gap-2 mt-3">
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
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {order.paymentMethod.replace("_", " ").toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Tracker */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Order Progress
              </h3>
              <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${(getStepIndex(order.status) / (statusSteps.length - 1)) * 100}%`,
                    }}
                  />
                </div>
                {statusSteps.map((step, idx) => {
                  const current = getStepIndex(order.status);
                  const isCompleted = idx <= current;
                  const isActive = idx === current;
                  return (
                    <div
                      key={step.key}
                      className="relative z-10 flex flex-col items-center"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                          isActive
                            ? "bg-blue-600 ring-4 ring-blue-200"
                            : isCompleted
                              ? "bg-blue-600"
                              : "bg-gray-200"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="text-white text-sm">
                            {step.icon}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            {step.icon}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs mt-2 font-medium hidden sm:block ${
                          isCompleted ? "text-blue-700" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Tracking Timeline
              </h3>
              <div className="space-y-0">
                {tracking.map((entry, idx) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          idx === tracking.length - 1
                            ? "bg-blue-600 ring-4 ring-blue-100"
                            : "bg-green-500"
                        }`}
                      />
                      {idx < tracking.length - 1 && (
                        <div className="w-0.5 h-16 bg-gray-200" />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="font-semibold text-gray-900">
                        {entry.status}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {entry.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {entry.location && `📍 ${entry.location} · `}
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.productName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × ₹{item.unitPrice}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">₹{item.totalPrice}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                📍 Shipping Address
              </h3>
              <p className="text-gray-700">{order.shippingAddress}</p>
              <p className="text-gray-700">
                {order.shippingCity}, {order.shippingState} {order.shippingZip}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-400 text-xl">Loading...</div>
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
