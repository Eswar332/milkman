"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";

type PaymentMethod = "credit_card" | "debit_card" | "upi" | "cod" | "net_banking";

export default function CheckoutPage() {
  const router = useRouter();
  const { customer, cart, cartTotal, clearCart, showToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [shipping, setShipping] = useState({
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [upiId, setUpiId] = useState("");
  const [notes, setNotes] = useState("");
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    totalAmount: string;
  } | null>(null);

  useEffect(() => {
    if (!customer) {
      router.push("/login");
      return;
    }
    if (cart.length === 0 && !orderSuccess) {
      router.push("/cart");
      return;
    }
    // Pre-fill shipping from customer data
    if (customer) {
      setShipping({
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zipCode || "",
      });
    }
  }, [customer, cart.length, router, orderSuccess]);

  const tax = cartTotal * 0.05;
  const total = cartTotal + tax;

  const handlePlaceOrder = async () => {
    if (!customer) return;

    if (!shipping.address || !shipping.city || !shipping.state || !shipping.zip) {
      showToast("Please fill in all shipping details", "error");
      return;
    }

    if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
      if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
        showToast("Please fill in all card details", "error");
        return;
      }
    }

    if (paymentMethod === "upi" && !upiId) {
      showToast("Please enter your UPI ID", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          items: cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.product.price),
          })),
          paymentMethod,
          shippingAddress: shipping.address,
          shippingCity: shipping.city,
          shippingState: shipping.state,
          shippingZip: shipping.zip,
          notes,
          cardNumber: cardDetails.number
            ? `****${cardDetails.number.slice(-4)}`
            : undefined,
          cardExpiry: cardDetails.expiry || undefined,
          upiId: upiId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to place order", "error");
        return;
      }

      setOrderSuccess({
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
      });
      clearCart();
      showToast("Order placed successfully! 🎉");
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Placed!
          </h1>
          <p className="text-gray-500 mb-6">
            Your order has been confirmed and a confirmation email has been sent.
          </p>
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {orderSuccess.orderNumber}
            </p>
            <p className="text-sm text-gray-500 mt-3">Total Amount</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              ₹{orderSuccess.totalAmount}
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() =>
                router.push(
                  `/track?orderNumber=${orderSuccess.orderNumber}`
                )
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
            >
              Track Your Order
            </button>
            <button
              onClick={() => router.push("/orders")}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition"
            >
              View All Orders
            </button>
            <button
              onClick={() => router.push("/products")}
              className="w-full text-blue-600 hover:text-blue-800 py-2 font-medium transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
          <p className="text-blue-100 mt-1">
            Complete your order in just a few steps
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  1
                </span>
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={shipping.address}
                    onChange={(e) =>
                      setShipping({ ...shipping, address: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street, Apt 4B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={shipping.city}
                    onChange={(e) =>
                      setShipping({ ...shipping, city: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.state}
                      onChange={(e) =>
                        setShipping({ ...shipping, state: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP *
                    </label>
                    <input
                      type="text"
                      required
                      value={shipping.zip}
                      onChange={(e) =>
                        setShipping({ ...shipping, zip: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  2
                </span>
                Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {([
                  { id: "credit_card" as const, label: "Credit Card", icon: "💳" },
                  { id: "debit_card" as const, label: "Debit Card", icon: "🏦" },
                  { id: "upi" as const, label: "UPI", icon: "📱" },
                  { id: "net_banking" as const, label: "Net Banking", icon: "🌐" },
                  { id: "cod" as const, label: "Cash on Delivery", icon: "💵" },
                ]).map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      paymentMethod === method.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{method.icon}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Card Details */}
              {(paymentMethod === "credit_card" ||
                paymentMethod === "debit_card") && (
                <div className="space-y-4 animate-fade-in bg-gray-50 p-4 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      value={cardDetails.name}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          name: e.target.value,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardDetails.number}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          number: e.target.value
                            .replace(/\D/g, "")
                            .replace(/(.{4})/g, "$1 ")
                            .trim(),
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            expiry: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardDetails.cvv}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cvv: e.target.value,
                          })
                        }
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="•••"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI */}
              {paymentMethod === "upi" && (
                <div className="animate-fade-in bg-gray-50 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="yourname@upi"
                  />
                </div>
              )}

              {/* Net Banking */}
              {paymentMethod === "net_banking" && (
                <div className="animate-fade-in bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">
                    You will be redirected to your bank&apos;s secure payment
                    page after placing the order. (Simulated for demo)
                  </p>
                </div>
              )}

              {/* COD */}
              {paymentMethod === "cod" && (
                <div className="animate-fade-in bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm text-yellow-800">
                    💵 Pay with cash when your order is delivered. Please keep
                    exact change ready.
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  3
                </span>
                Order Notes (Optional)
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                placeholder="Any special instructions for delivery..."
              />
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{(parseFloat(item.product.price) * item.quantity).toFixed(
                        2
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Delivery</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Tax (5%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span className="text-green-600">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition disabled:bg-green-400 animate-pulse-glow"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing Payment...
                  </span>
                ) : (
                  `Place Order - ₹${total.toFixed(2)}`
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                🔒 Your payment information is secure and encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
