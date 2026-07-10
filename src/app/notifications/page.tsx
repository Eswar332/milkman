"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/context/StoreContext";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: number;
  customerId: number;
  type: string;
  subject: string;
  htmlBody: string;
  orderNumber: string | null;
  isRead: boolean;
  emailSent: boolean;
  emailError: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { customer, showToast } = useStore();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openNotifId, setOpenNotifId] = useState<number | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (!customer) return;
    try {
      const res = await fetch(
        `/api/notifications?customerId=${customer.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (!customer) {
      router.push("/login");
      return;
    }
    fetchNotifs();
  }, [customer, router, fetchNotifs]);

  const markAsRead = async (notificationId: number) => {
    if (!customer) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          notificationId,
        }),
      });
      setNotifs((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    if (!customer) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, markAll: true }),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast("All notifications marked as read");
    } catch {
      /* ignore */
    }
  };

  const toggleOpen = (id: number) => {
    if (openNotifId === id) {
      setOpenNotifId(null);
    } else {
      setOpenNotifId(id);
      // Mark as read when opened
      const n = notifs.find((x) => x.id === id);
      if (n && !n.isRead) markAsRead(id);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order_confirmation":
        return "✅";
      case "status_update":
        return "📦";
      default:
        return "📬";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "order_confirmation":
        return "Order Confirmation";
      case "status_update":
        return "Status Update";
      default:
        return "Notification";
    }
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 py-10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              📬 Notifications
            </h1>
            <p className="text-blue-100 mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="bg-white/20 backdrop-blur text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-white/30 transition border border-white/30"
            >
              ✓ Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-24 animate-pulse"
              />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-8xl block mb-6">📭</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No notifications yet
            </h2>
            <p className="text-gray-500 mb-6">
              When you place an order, your confirmation emails and status
              updates will appear here.
            </p>
            <Link
              href="/products"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map((notif) => (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all shadow-sm ${
                  !notif.isRead
                    ? "border-blue-300 ring-2 ring-blue-100"
                    : "border-gray-100"
                }`}
              >
                {/* Notification header row */}
                <button
                  onClick={() => toggleOpen(notif.id)}
                  className="w-full text-left p-5 flex items-start gap-4 hover:bg-gray-50 transition"
                >
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      !notif.isRead ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          notif.type === "order_confirmation"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {getTypeLabel(notif.type)}
                      </span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                      {notif.emailSent && (
                        <span className="text-xs text-green-600" title="Email delivered">
                          ✉️ Sent
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm truncate ${
                        !notif.isRead
                          ? "font-bold text-gray-900"
                          : "font-medium text-gray-700"
                      }`}
                    >
                      {notif.subject}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(notif.createdAt)}
                      {notif.orderNumber && (
                        <span className="ml-2">
                          · Order #{notif.orderNumber}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Expand chevron */}
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform mt-1 ${
                      openNotifId === notif.id ? "rotate-180" : ""
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
                </button>

                {/* Expanded email preview */}
                {openNotifId === notif.id && (
                  <div className="border-t animate-fade-in">
                    {/* Action bar */}
                    <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {notif.emailSent
                          ? "✅ This email was also sent to your inbox."
                          : "📬 This notification is available in-app. Configure SMTP for email delivery."}
                      </p>
                      {notif.orderNumber && (
                        <Link
                          href={`/track?orderNumber=${notif.orderNumber}`}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                          Track Order
                        </Link>
                      )}
                    </div>

                    {/* Rendered email HTML */}
                    <div className="p-5 bg-gray-100">
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-[600px] mx-auto">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: notif.htmlBody,
                          }}
                        />
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
