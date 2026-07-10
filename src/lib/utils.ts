import { v4 as uuidv4 } from "uuid";

export function generateOrderNumber(): string {
  const prefix = "MLK";
  const date = new Date();
  const dateStr =
    date.getFullYear().toString().slice(2) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const unique = uuidv4().slice(0, 6).toUpperCase();
  return `${prefix}-${dateStr}-${unique}`;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  let d: Date;
  if (typeof date === "string") {
    // PostgreSQL "timestamp without time zone" doesn't include timezone info.
    // The server stores everything in UTC, so we ensure the string is parsed
    // as UTC by appending "Z" if no timezone indicator is present.
    const hasTimezone = /Z|[+-]\d{2}:\d{2}$/.test(date);
    const iso = hasTimezone ? date : date.replace(" ", "T") + "Z";
    d = new Date(iso);
  } else {
    d = date;
  }
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    cod: "bg-blue-100 text-blue-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}
