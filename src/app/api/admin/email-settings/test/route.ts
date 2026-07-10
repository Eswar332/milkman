import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const envKey = process.env.ADMIN_SECRET || "milkfresh-admin-2026";
  return adminKey === envKey;
}

const testSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number(),
  smtpSecure: z.boolean(),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  testRecipient: z.string().email(),
});

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = testSchema.parse(body);

    // Step 1 — Create transporter
    const transporter = nodemailer.createTransport({
      host: data.smtpHost,
      port: data.smtpPort,
      secure: data.smtpSecure,
      auth: {
        user: data.smtpUser,
        pass: data.smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    // Step 2 — Verify connection
    try {
      await transporter.verify();
    } catch (verifyErr) {
      const msg =
        verifyErr instanceof Error ? verifyErr.message : "Connection failed";
      return NextResponse.json({
        success: false,
        step: "connection",
        error: `SMTP connection failed: ${msg}`,
        hint: getHint(data.smtpHost, msg),
      });
    }

    // Step 3 — Send test email
    try {
      await transporter.sendMail({
        from: `"${data.fromName}" <${data.fromEmail}>`,
        to: data.testRecipient,
        subject: "✅ MilkFresh — Test Email Successful!",
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;padding:0">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:30px;text-align:center;border-radius:12px 12px 0 0">
              <h1 style="color:white;margin:0;font-size:24px">🥛 MilkFresh</h1>
              <p style="color:#bfdbfe;margin:5px 0 0">Email Configuration Test</p>
            </div>
            <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
              <div style="text-align:center;margin-bottom:20px">
                <span style="font-size:48px">✅</span>
              </div>
              <h2 style="color:#166534;text-align:center;margin:0 0 10px">Email is Working!</h2>
              <p style="color:#6b7280;text-align:center;font-size:14px;line-height:1.6">
                Your SMTP settings are correctly configured. MilkFresh will now send real email
                notifications for order confirmations and status updates.
              </p>
              <div style="background:#f0fdf4;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #bbf7d0">
                <p style="margin:0;font-size:13px;color:#166534"><strong>SMTP Host:</strong> ${data.smtpHost}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#166534"><strong>Port:</strong> ${data.smtpPort} (${data.smtpSecure ? "SSL/TLS" : "STARTTLS"})</p>
                <p style="margin:4px 0 0;font-size:13px;color:#166534"><strong>From:</strong> ${data.fromName} &lt;${data.fromEmail}&gt;</p>
              </div>
              <p style="color:#9ca3af;font-size:11px;text-align:center;margin:15px 0 0">
                © 2026 MilkFresh — Fresh Dairy, Delivered with Care 🌿
              </p>
            </div>
          </div>
        `,
      });
    } catch (sendErr) {
      const msg =
        sendErr instanceof Error ? sendErr.message : "Send failed";
      return NextResponse.json({
        success: false,
        step: "sending",
        error: `Connected but sending failed: ${msg}`,
        hint: getHint(data.smtpHost, msg),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${data.testRecipient}! Check your inbox (and spam folder).`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Test email error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    );
  }
}

function getHint(host: string, error: string): string {
  const e = error.toLowerCase();
  const h = host.toLowerCase();

  if (h.includes("gmail")) {
    if (e.includes("auth") || e.includes("credentials") || e.includes("535")) {
      return 'Gmail requires an App Password (not your regular password). Go to myaccount.google.com → Security → 2-Step Verification → App Passwords → create one for "Mail".';
    }
    if (e.includes("less secure")) {
      return "Gmail blocked the sign-in. Use an App Password instead of your regular password.";
    }
  }

  if (h.includes("outlook") || h.includes("office365") || h.includes("hotmail")) {
    if (e.includes("auth") || e.includes("535")) {
      return "Outlook/Microsoft 365 may require an App Password if 2FA is enabled. Check your Microsoft account security settings.";
    }
  }

  if (e.includes("econnrefused") || e.includes("timeout")) {
    return `Cannot reach ${host}. Check the hostname and port. Make sure your firewall/network allows outbound connections on this port.`;
  }

  if (e.includes("certificate") || e.includes("self-signed") || e.includes("ssl")) {
    return 'Try toggling the "Use SSL/TLS" setting, or switch between port 465 (SSL) and 587 (STARTTLS).';
  }

  return "Double-check your SMTP host, port, username, and password. If using Gmail/Outlook, you may need an App Password.";
}
