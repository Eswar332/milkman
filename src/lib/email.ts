import { db } from "@/db";
import { notifications, emailSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────
interface OrderEmailData {
  customerId: number;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  totalAmount: string;
  paymentMethod: string;
  shippingAddress: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

// ─── Get SMTP config (DB first, then .env fallback) ──────
async function getSmtpConfig(): Promise<SmtpConfig | null> {
  // 1. Try database settings (admin-configured via UI)
  try {
    const dbSettings = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.isActive, true))
      .limit(1);

    if (dbSettings.length > 0) {
      const s = dbSettings[0];
      return {
        host: s.smtpHost,
        port: s.smtpPort,
        secure: s.smtpSecure,
        user: s.smtpUser,
        pass: s.smtpPass,
        fromName: s.fromName,
        fromEmail: s.fromEmail,
      };
    }
  } catch {
    // DB not ready or table missing — continue to env fallback
  }

  // 2. Fallback to .env variables
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      fromName: process.env.SMTP_FROM_NAME || "MilkFresh",
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "orders@milkfresh.com",
    };
  }

  return null;
}

// ─── Core send function ──────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error: string | null }> {
  const config = await getSmtpConfig();

  if (!config) {
    return {
      sent: false,
      error: "SMTP not configured — go to Admin → Email Settings to set up",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to} — "${subject}"`);
    return { sent: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SMTP send failed";
    console.error(`❌ Email failed to ${to}:`, msg);
    return { sent: false, error: msg };
  }
}

// ─── Build order confirmation email HTML ─────────────────
function buildOrderEmailHtml(data: OrderEmailData): string {
  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:14px">${item.name}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${item.quantity}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px">₹${item.unitPrice}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">₹${item.totalPrice}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f8fafc">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:40px 30px;text-align:center">
        <h1 style="color:white;margin:0;font-size:28px;letter-spacing:-0.5px">🥛 MilkFresh</h1>
        <p style="color:#bfdbfe;margin:8px 0 0;font-size:15px">Order Confirmation</p>
      </div>
      <div style="background:white;padding:35px 30px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
        <p style="color:#374151;font-size:16px;margin:0 0 5px">Dear <strong>${data.customerName}</strong>,</p>
        <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 25px">
          Thank you for your order! We're preparing your fresh dairy products and will have them on their way to you soon.
        </p>
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:20px;border-radius:12px;margin:0 0 25px;border:1px solid #bfdbfe">
          <table style="width:100%"><tr>
            <td>
              <p style="margin:0;color:#1e40af;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Order Number</p>
              <p style="margin:4px 0 0;color:#1e3a8a;font-weight:800;font-size:22px">${data.orderNumber}</p>
            </td>
            <td style="text-align:right">
              <p style="margin:0;color:#1e40af;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Payment</p>
              <p style="margin:4px 0 0;color:#1e3a8a;font-weight:600;font-size:14px">${data.paymentMethod}</p>
            </td>
          </tr></table>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:10px 8px;text-align:left;color:#374151;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Product</th>
              <th style="padding:10px 8px;text-align:center;color:#374151;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Qty</th>
              <th style="padding:10px 8px;text-align:right;color:#374151;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Price</th>
              <th style="padding:10px 8px;text-align:right;color:#374151;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:right;padding:18px 20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;border:1px solid #bbf7d0">
          <p style="margin:0;font-size:13px;color:#166534;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Order Total</p>
          <p style="margin:4px 0 0;font-size:28px;color:#15803d;font-weight:800">₹${data.totalAmount}</p>
        </div>
        <div style="margin-top:25px;padding:18px 20px;background:#fefce8;border-radius:12px;border:1px solid #fde68a">
          <p style="margin:0;color:#854d0e;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">📍 Delivery Address</p>
          <p style="margin:8px 0 0;color:#713f12;font-size:14px;line-height:1.5">${data.shippingAddress}</p>
        </div>
        <div style="margin-top:25px;text-align:center">
          <p style="color:#6b7280;font-size:14px;margin:0 0 12px">Track your order status anytime:</p>
          <div style="background:#1e40af;color:white;padding:14px 28px;border-radius:10px;display:inline-block;font-weight:700;font-size:15px">
            Order # ${data.orderNumber}
          </div>
          <p style="color:#9ca3af;font-size:12px;margin:12px 0 0">
            Go to our website → Track Order → Enter your order number
          </p>
        </div>
      </div>
      <div style="padding:25px 30px;text-align:center;background:#f1f5f9;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#64748b;font-size:13px;margin:0">Need help? Contact us at <strong>orders@milkfresh.com</strong></p>
        <p style="color:#94a3b8;font-size:11px;margin:8px 0 0">© 2026 MilkFresh — Fresh Dairy, Delivered with Care 🌿</p>
      </div>
    </div>
  `;
}

// ─── Build status update email HTML ──────────────────────
function buildStatusEmailHtml(data: {
  customerName: string;
  orderNumber: string;
  newStatus: string;
  description: string;
}): string {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:30px;text-align:center">
        <h1 style="color:white;margin:0;font-size:24px">🥛 MilkFresh</h1>
        <p style="color:#bfdbfe;margin:5px 0 0;font-size:14px">Order Status Update</p>
      </div>
      <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-top:none">
        <p style="color:#374151;font-size:16px;margin:0 0 15px">Dear <strong>${data.customerName}</strong>,</p>
        <div style="background:#eff6ff;padding:20px;border-radius:12px;margin:0 0 20px;border:1px solid #bfdbfe">
          <p style="margin:0;color:#1e40af;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Order #${data.orderNumber}</p>
          <p style="margin:8px 0 0;color:#1e3a8a;font-size:20px;font-weight:800">${data.newStatus}</p>
        </div>
        <div style="background:#f0fdf4;padding:18px;border-radius:12px;border:1px solid #bbf7d0">
          <p style="margin:0;color:#166534;font-size:14px;line-height:1.6">${data.description}</p>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:20px 0 0;text-align:center">
          Track your full order timeline on our website.
        </p>
      </div>
      <div style="padding:20px;text-align:center;background:#f1f5f9;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#94a3b8;font-size:11px;margin:0">© 2026 MilkFresh — Fresh Dairy, Delivered with Care 🌿</p>
      </div>
    </div>
  `;
}

// ─── Public API: Send order confirmation ─────────────────
export async function sendOrderConfirmationEmail(
  data: OrderEmailData
): Promise<boolean> {
  const subject = `✅ Order Confirmed — ${data.orderNumber}`;
  const htmlBody = buildOrderEmailHtml(data);

  // 1. Send real email
  const { sent, error } = await sendEmail(
    data.customerEmail,
    subject,
    htmlBody
  );

  // 2. Always save as in-app notification
  try {
    await db.insert(notifications).values({
      customerId: data.customerId,
      type: "order_confirmation",
      subject,
      htmlBody,
      orderNumber: data.orderNumber,
      isRead: false,
      emailSent: sent,
      emailError: error,
    });
  } catch (dbErr) {
    console.error("Failed to save notification:", dbErr);
  }

  return true;
}

// ─── Public API: Send status update notification ─────────
export async function sendStatusUpdateNotification(data: {
  customerId: number;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  newStatus: string;
  description: string;
}): Promise<boolean> {
  const subject = `📦 Order Update — ${data.orderNumber}: ${data.newStatus}`;
  const htmlBody = buildStatusEmailHtml(data);

  // 1. Send real email
  const { sent, error } = await sendEmail(
    data.customerEmail,
    subject,
    htmlBody
  );

  // 2. Always save as in-app notification
  try {
    await db.insert(notifications).values({
      customerId: data.customerId,
      type: "status_update",
      subject,
      htmlBody,
      orderNumber: data.orderNumber,
      isRead: false,
      emailSent: sent,
      emailError: error,
    });
  } catch (err) {
    console.error("Failed to save status notification:", err);
  }

  return true;
}
