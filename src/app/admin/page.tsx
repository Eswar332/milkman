"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getPaymentStatusColor,
} from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────
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
interface AdminOrder {
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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  items: OrderItem[];
  tracking: TrackingEntry[];
}
interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

// ─── Constants ───────────────────────────────────────────
const ORDER_STATUSES = [
  { value: "pending", label: "Pending", icon: "⏳" },
  { value: "confirmed", label: "Confirmed", icon: "✅" },
  { value: "processing", label: "Processing", icon: "⚙️" },
  { value: "shipped", label: "Shipped", icon: "📦" },
  { value: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
  { value: "delivered", label: "Delivered", icon: "🎉" },
  { value: "cancelled", label: "Cancelled", icon: "❌" },
];

const TRACKING_TEMPLATES: Record<
  string,
  { description: string; location: string }
> = {
  pending: {
    description: "Order is awaiting confirmation.",
    location: "Online",
  },
  confirmed: {
    description: "Order has been confirmed and is being prepared.",
    location: "Warehouse",
  },
  processing: {
    description: "Order is being packed and prepared for shipment.",
    location: "Warehouse",
  },
  shipped: {
    description: "Order has been shipped and is on its way.",
    location: "Distribution Center",
  },
  out_for_delivery: {
    description: "Order is out for delivery and will arrive today.",
    location: "Local Hub",
  },
  delivered: {
    description: "Order has been delivered successfully.",
    location: "Customer Address",
  },
  cancelled: {
    description: "Order has been cancelled.",
    location: "—",
  },
};

// ─── Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Use a ref so fetchAll always reads the latest key, no stale closures
  const adminKeyRef = useRef("");

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "email"
  >("dashboard");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Email settings state
  const [emailForm, setEmailForm] = useState({
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    fromName: "MilkFresh",
    fromEmail: "",
  });
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    hint?: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Update-status modal state
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [updateForm, setUpdateForm] = useState({
    status: "",
    trackingDescription: "",
    trackingLocation: "",
    trackingNumber: "",
    paymentStatus: "",
  });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  // Expanded order id for detail view
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ─── Fetch orders + stats ──────────────────────────────
  const fetchAll = async () => {
    const key = adminKeyRef.current;
    if (!key) return;

    setLoading(true);
    setFetchError("");

    try {
      const headers = { "x-admin-key": key };

      const [ordersRes, statsRes] = await Promise.all([
        fetch("/api/admin/orders", { headers }),
        fetch("/api/admin/stats", { headers }),
      ]);

      // Handle auth failure
      if (ordersRes.status === 401 || statsRes.status === 401) {
        setAuthenticated(false);
        adminKeyRef.current = "";
        setFetchError("Session expired. Please login again.");
        return;
      }

      // Handle server errors
      if (!ordersRes.ok) {
        const errData = await ordersRes.json().catch(() => null);
        setFetchError(
          `Failed to load orders: ${errData?.error || ordersRes.statusText}`
        );
        return;
      }

      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();

      // Guard: make sure ordersData is actually an array
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      } else {
        setOrders([]);
        setFetchError(
          ordersData?.error || "Unexpected response from orders API."
        );
      }

      setStats(statsData);
    } catch (err) {
      console.error("fetchAll error:", err);
      setFetchError("Network error – could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Admin Login ───────────────────────────────────────
  const handleLogin = async () => {
    setLoginError("");
    const key = loginInput.trim();
    if (!key) {
      setLoginError("Please enter the admin key.");
      return;
    }

    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-key": key },
      });

      if (res.status === 401) {
        setLoginError("Invalid admin key.");
        return;
      }

      if (!res.ok) {
        setLoginError("Server error. Try again.");
        return;
      }

      // Store key in ref (available instantly, no state lag)
      adminKeyRef.current = key;
      setAuthenticated(true);

      // Fetch data immediately with the correct key
      // (don't rely on useEffect — avoids stale-state race condition)
      const statsData = await res.json();
      setStats(statsData);

      // Now fetch orders too
      const ordersRes = await fetch("/api/admin/orders", {
        headers: { "x-admin-key": key },
      });

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        }
      }
    } catch {
      setLoginError("Network error. Please try again.");
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  // ─── Email Settings ────────────────────────────────────
  const fetchEmailSettings = async () => {
    const key = adminKeyRef.current;
    if (!key) return;
    try {
      const res = await fetch("/api/admin/email-settings", {
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setEmailConfigured(data.configured);
        if (data.configured && data.settings) {
          setEmailForm({
            smtpHost: data.settings.smtpHost,
            smtpPort: data.settings.smtpPort,
            smtpSecure: data.settings.smtpSecure,
            smtpUser: data.settings.smtpUser,
            smtpPass: "", // don't pre-fill password
            fromName: data.settings.fromName,
            fromEmail: data.settings.fromEmail,
          });
        }
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (authenticated && activeTab === "email") {
      fetchEmailSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, activeTab]);

  const saveEmailSettings = async () => {
    if (
      !emailForm.smtpHost ||
      !emailForm.smtpUser ||
      !emailForm.smtpPass ||
      !emailForm.fromEmail
    ) {
      setEmailMsg("⚠️ Please fill in all required fields.");
      return;
    }
    setEmailLoading(true);
    setEmailMsg("");
    try {
      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKeyRef.current,
        },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMsg("✅ " + data.message);
        setEmailConfigured(true);
      } else {
        let msg = data.error || "Failed to save";
        if (data.details && Array.isArray(data.details)) {
          msg += ": " + data.details.map((d: { message: string }) => d.message).join(", ");
        }
        setEmailMsg("❌ " + msg);
      }
    } catch {
      setEmailMsg("❌ Network error — check your connection and try again");
    } finally {
      setEmailLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testRecipient) {
      setTestResult({ success: false, error: "Enter a recipient email." });
      return;
    }
    if (
      !emailForm.smtpHost ||
      !emailForm.smtpUser ||
      !emailForm.smtpPass ||
      !emailForm.fromEmail
    ) {
      setTestResult({
        success: false,
        error: "Fill in all SMTP fields first.",
      });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-settings/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKeyRef.current,
        },
        body: JSON.stringify({ ...emailForm, testRecipient }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setTestLoading(false);
    }
  };

  // ─── Status Update ────────────────────────────────────
  const openUpdateModal = (order: AdminOrder) => {
    setSelectedOrder(order);
    setUpdateForm({
      status: order.status,
      trackingDescription: "",
      trackingLocation: "",
      trackingNumber: order.trackingNumber || "",
      paymentStatus: order.paymentStatus,
    });
    setUpdateMsg("");
  };

  const applyTemplate = (status: string) => {
    const tpl = TRACKING_TEMPLATES[status];
    if (tpl) {
      setUpdateForm((f) => ({
        ...f,
        status,
        trackingDescription: tpl.description,
        trackingLocation: tpl.location,
      }));
    } else {
      setUpdateForm((f) => ({ ...f, status }));
    }
  };

  const submitUpdate = async () => {
    if (!selectedOrder) return;
    if (!updateForm.trackingDescription.trim()) {
      setUpdateMsg("⚠️ Please enter a tracking description.");
      return;
    }
    setUpdating(true);
    setUpdateMsg("");
    try {
      const res = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKeyRef.current,
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: updateForm.status,
          trackingDescription: updateForm.trackingDescription,
          trackingLocation: updateForm.trackingLocation || undefined,
          trackingNumber: updateForm.trackingNumber || undefined,
          paymentStatus: updateForm.paymentStatus || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpdateMsg(`❌ ${data.error}`);
      } else {
        setUpdateMsg(`✅ ${data.message}`);
        await fetchAll(); // refresh list
        setTimeout(() => setSelectedOrder(null), 1200);
      }
    } catch {
      setUpdateMsg("❌ Network error.");
    } finally {
      setUpdating(false);
    }
  };

  // ─── Filter & search ──────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // ─── Login screen ─────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <span className="text-5xl">🔐</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Enter your admin secret key to continue
            </p>
          </div>
          {loginError && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4 font-medium">
              {loginError}
            </div>
          )}
          <input
            type="password"
            placeholder="Admin Secret Key"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
          >
            Access Dashboard
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Default key:{" "}
            <code className="bg-gray-100 px-2 py-0.5 rounded">
              milkfresh-admin-2026
            </code>
          </p>
        </div>
      </div>
    );
  }

  // ─── Main dashboard ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🥛</span>
            <h1 className="text-lg font-bold">
              MilkFresh <span className="text-blue-400">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === "dashboard" ? "bg-blue-600" : "hover:bg-slate-700"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === "orders" ? "bg-blue-600" : "hover:bg-slate-700"}`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === "email" ? "bg-blue-600" : "hover:bg-slate-700"}`}
            >
              ✉️ Email
              {!emailConfigured && (
                <span className="ml-1.5 w-2 h-2 bg-yellow-400 rounded-full inline-block" />
              )}
            </button>
            <button
              onClick={() => {
                setAuthenticated(false);
                adminKeyRef.current = "";
              }}
              className="text-sm text-red-400 hover:text-red-300 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Global fetch error banner */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6 flex items-center justify-between">
            <p className="font-medium text-sm">{fetchError}</p>
            <button
              onClick={fetchAll}
              className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── DASHBOARD TAB ──────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Orders",
                  value: stats?.totalOrders ?? 0,
                  icon: "📦",
                  color: "bg-blue-50 text-blue-700",
                },
                {
                  label: "Revenue",
                  value: formatCurrency(stats?.totalRevenue ?? 0),
                  icon: "💰",
                  color: "bg-green-50 text-green-700",
                },
                {
                  label: "Customers",
                  value: stats?.totalCustomers ?? 0,
                  icon: "👥",
                  color: "bg-purple-50 text-purple-700",
                },
                {
                  label: "Products",
                  value: stats?.totalProducts ?? 0,
                  icon: "🧀",
                  color: "bg-orange-50 text-orange-700",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-2xl p-6 ${s.color} border border-white shadow-sm`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium opacity-80">
                        {s.label}
                      </p>
                      <p className="text-3xl font-bold mt-1">{s.value}</p>
                    </div>
                    <span className="text-3xl">{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            {stats && stats.statusBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Orders by Status
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  {ORDER_STATUSES.map((s) => {
                    const entry = stats.statusBreakdown.find(
                      (b) => b.status === s.value
                    );
                    return (
                      <div
                        key={s.value}
                        className={`rounded-xl p-4 text-center ${getStatusColor(s.value)}`}
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <p className="text-2xl font-bold mt-1">
                          {entry?.count ?? 0}
                        </p>
                        <p className="text-xs font-medium mt-0.5">
                          {s.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick action */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-1">Quick Actions</h3>
              <p className="text-blue-100 text-sm mb-4">
                Go to the Orders tab to update tracking status for any order.
              </p>
              <button
                onClick={() => setActiveTab("orders")}
                className="bg-white text-blue-700 px-6 py-2 rounded-xl font-semibold hover:bg-blue-50 transition"
              >
                Manage Orders →
              </button>
            </div>
          </div>
        )}

        {/* ─── ORDERS TAB ─────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                All Orders ({filteredOrders.length})
              </h2>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "🔄 Refresh"}
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search order #, customer name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${filterStatus === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border"}`}
                >
                  All
                </button>
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setFilterStatus(s.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${filterStatus === s.value ? "bg-gray-900 text-white" : "bg-white text-gray-600 border"}`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Order list */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-24 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border">
                <span className="text-6xl block mb-4">📭</span>
                <p className="text-gray-700 font-semibold text-lg">
                  No orders found
                </p>
                <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                  Orders placed by customers on the storefront will appear here.
                  Ask a customer to place an order first, or place a test order
                  yourself.
                </p>
                <button
                  onClick={fetchAll}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition"
                >
                  🔄 Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Row */}
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}
                          >
                            {order.status.replace("_", " ").toUpperCase()}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}
                          >
                            {order.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          👤 {order.customerName} · 📧 {order.customerEmail}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(order.createdAt)} ·{" "}
                          {order.items.length} item
                          {order.items.length > 1 ? "s" : ""} ·{" "}
                          {order.paymentMethod.replace("_", " ").toUpperCase()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        <button
                          onClick={() =>
                            setExpandedId(
                              expandedId === order.id ? null : order.id
                            )
                          }
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {expandedId === order.id ? "Hide" : "Details"}
                        </button>
                        <button
                          onClick={() => openUpdateModal(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expandedId === order.id && (
                      <div className="border-t bg-gray-50 p-5 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Items */}
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm mb-3">
                              🛒 Items
                            </h4>
                            <div className="space-y-2">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 bg-white p-2 rounded-lg"
                                >
                                  <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                    <Image
                                      src={item.productImage}
                                      alt={item.productName}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">
                                      {item.productName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {item.quantity} × ₹{item.unitPrice}
                                    </p>
                                  </div>
                                  <span className="text-xs font-bold">
                                    ₹{item.totalPrice}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipping */}
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm mb-3">
                              📍 Shipping
                            </h4>
                            <div className="bg-white p-3 rounded-lg text-sm text-gray-700">
                              <p>{order.shippingAddress}</p>
                              <p>
                                {order.shippingCity}, {order.shippingState}{" "}
                                {order.shippingZip}
                              </p>
                              {order.trackingNumber && (
                                <p className="mt-2 text-blue-700 font-medium">
                                  Tracking #: {order.trackingNumber}
                                </p>
                              )}
                              {order.notes && (
                                <p className="mt-2 text-gray-500 italic text-xs">
                                  Note: {order.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Tracking history */}
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm mb-3">
                              📋 Tracking History
                            </h4>
                            {order.tracking.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">
                                No tracking entries yet.
                              </p>
                            ) : (
                              <div className="space-y-0 max-h-48 overflow-y-auto">
                                {order.tracking.map((t, idx) => (
                                  <div key={t.id} className="flex gap-2">
                                    <div className="flex flex-col items-center">
                                      <div
                                        className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? "bg-blue-600" : "bg-gray-300"}`}
                                      />
                                      {idx < order.tracking.length - 1 && (
                                        <div className="w-px h-8 bg-gray-200" />
                                      )}
                                    </div>
                                    <div className="pb-2">
                                      <p className="text-xs font-semibold text-gray-900">
                                        {t.status}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {t.description}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {t.location && `${t.location} · `}
                                        {formatDate(t.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── EMAIL SETTINGS TAB ─────────────────────── */}
        {activeTab === "email" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  ✉️ Email Settings
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Configure SMTP to send real order confirmations and status
                  updates to customers.
                </p>
              </div>
              <span
                className={`text-sm font-semibold px-4 py-1.5 rounded-full ${
                  emailConfigured
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {emailConfigured ? "✅ Configured" : "⚠️ Not Configured"}
              </span>
            </div>

            {/* Provider quick-select */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Setup — Choose your email provider:
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: "Gmail",
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: false,
                  },
                  {
                    label: "Outlook / Microsoft 365",
                    host: "smtp.office365.com",
                    port: 587,
                    secure: false,
                  },
                  {
                    label: "Yahoo Mail",
                    host: "smtp.mail.yahoo.com",
                    port: 587,
                    secure: false,
                  },
                  {
                    label: "SendGrid",
                    host: "smtp.sendgrid.net",
                    port: 587,
                    secure: false,
                  },
                  {
                    label: "Zoho Mail",
                    host: "smtp.zoho.com",
                    port: 465,
                    secure: true,
                  },
                  {
                    label: "Mailgun",
                    host: "smtp.mailgun.org",
                    port: 587,
                    secure: false,
                  },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() =>
                      setEmailForm((f) => ({
                        ...f,
                        smtpHost: p.host,
                        smtpPort: p.port,
                        smtpSecure: p.secure,
                      }))
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                      emailForm.smtpHost === p.host
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP Form */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                SMTP Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtpHost}
                    onChange={(e) =>
                      setEmailForm((f) => ({
                        ...f,
                        smtpHost: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Port *
                    </label>
                    <input
                      type="number"
                      value={emailForm.smtpPort}
                      onChange={(e) =>
                        setEmailForm((f) => ({
                          ...f,
                          smtpPort: parseInt(e.target.value) || 587,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      SSL/TLS
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEmailForm((f) => ({
                          ...f,
                          smtpSecure: !f.smtpSecure,
                        }))
                      }
                      className={`w-full py-3 rounded-xl text-sm font-semibold border-2 transition ${
                        emailForm.smtpSecure
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-gray-50 text-gray-500"
                      }`}
                    >
                      {emailForm.smtpSecure ? "🔒 SSL On" : "🔓 SSL Off"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Username / Email *
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtpUser}
                    onChange={(e) =>
                      setEmailForm((f) => ({
                        ...f,
                        smtpUser: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="you@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Password / App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={emailForm.smtpPass}
                      onChange={(e) =>
                        setEmailForm((f) => ({
                          ...f,
                          smtpPass: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="App Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    From Name *
                  </label>
                  <input
                    type="text"
                    value={emailForm.fromName}
                    onChange={(e) =>
                      setEmailForm((f) => ({
                        ...f,
                        fromName: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="MilkFresh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    From Email *
                  </label>
                  <input
                    type="email"
                    value={emailForm.fromEmail}
                    onChange={(e) =>
                      setEmailForm((f) => ({
                        ...f,
                        fromEmail: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="orders@milkfresh.com"
                  />
                </div>
              </div>

              {emailMsg && (
                <div
                  className={`mt-4 p-3 rounded-xl text-sm font-medium ${
                    emailMsg.startsWith("✅")
                      ? "bg-green-50 text-green-700"
                      : emailMsg.startsWith("⚠️")
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {emailMsg}
                </div>
              )}

              <button
                onClick={saveEmailSettings}
                disabled={emailLoading}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:bg-blue-400"
              >
                {emailLoading ? "Saving..." : "💾 Save Settings"}
              </button>
            </div>

            {/* Test email */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                🧪 Send Test Email
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Enter an email address and send a test to verify everything
                works.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="test@example.com"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition disabled:bg-green-400 whitespace-nowrap"
                >
                  {testLoading ? "Sending..." : "📨 Send Test"}
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-4 p-4 rounded-xl ${
                    testResult.success
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  {testResult.success ? (
                    <div>
                      <p className="font-semibold text-green-700">
                        ✅ {testResult.message}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-700">
                        ❌ {testResult.error}
                      </p>
                      {testResult.hint && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            <strong>💡 Hint:</strong> {testResult.hint}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Gmail guide */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                📘 Gmail Setup Guide (Most Common)
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  Go to{" "}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Google Account → Security
                  </a>
                </li>
                <li>
                  Enable <strong>2-Step Verification</strong> if not already
                  on
                </li>
                <li>
                  Go to{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    App Passwords
                  </a>{" "}
                  → create a new one for &ldquo;Mail&rdquo;
                </li>
                <li>
                  Copy the 16-character password Google gives you
                </li>
                <li>
                  Use these settings above:
                  <div className="mt-2 bg-white p-3 rounded-lg text-xs font-mono space-y-1">
                    <p>
                      <strong>Host:</strong> smtp.gmail.com
                    </p>
                    <p>
                      <strong>Port:</strong> 587
                    </p>
                    <p>
                      <strong>SSL:</strong> Off (uses STARTTLS)
                    </p>
                    <p>
                      <strong>Username:</strong> your-email@gmail.com
                    </p>
                    <p>
                      <strong>Password:</strong> the 16-char App Password
                    </p>
                    <p>
                      <strong>From Email:</strong> your-email@gmail.com
                    </p>
                  </div>
                </li>
                <li>
                  Click <strong>Save Settings</strong> → then{" "}
                  <strong>Send Test</strong> ✅
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* ─── UPDATE STATUS MODAL ──────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Update Order Status
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedOrder.orderNumber} · {selectedOrder.customerName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Current status */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Current Status</p>
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}
                >
                  {selectedOrder.status.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* New status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => applyTemplate(s.value)}
                      className={`p-3 rounded-xl border-2 text-left text-sm transition ${
                        updateForm.status === s.value
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="mr-1">{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracking description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tracking Description *
                </label>
                <textarea
                  value={updateForm.trackingDescription}
                  onChange={(e) =>
                    setUpdateForm((f) => ({
                      ...f,
                      trackingDescription: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  placeholder="Describe the status update the customer will see..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  💡 A template is auto-filled when you pick a status. Feel free
                  to customise it.
                </p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={updateForm.trackingLocation}
                  onChange={(e) =>
                    setUpdateForm((f) => ({
                      ...f,
                      trackingLocation: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Warehouse, Distribution Center, Local Hub..."
                />
              </div>

              {/* Tracking number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tracking / Shipment Number
                </label>
                <input
                  type="text"
                  value={updateForm.trackingNumber}
                  onChange={(e) =>
                    setUpdateForm((f) => ({
                      ...f,
                      trackingNumber: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. SHIP-12345 (optional)"
                />
              </div>

              {/* Payment status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {["pending", "paid", "failed", "refunded", "cod"].map(
                    (ps) => (
                      <button
                        key={ps}
                        type="button"
                        onClick={() =>
                          setUpdateForm((f) => ({
                            ...f,
                            paymentStatus: ps,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          updateForm.paymentStatus === ps
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        {ps.toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Result message */}
              {updateMsg && (
                <div
                  className={`p-3 rounded-xl text-sm font-medium ${
                    updateMsg.startsWith("✅")
                      ? "bg-green-50 text-green-700"
                      : updateMsg.startsWith("⚠️")
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {updateMsg}
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={submitUpdate}
                disabled={updating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:bg-blue-400"
              >
                {updating ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
