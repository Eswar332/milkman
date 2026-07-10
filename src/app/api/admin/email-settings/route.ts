import { db } from "@/db";
import { emailSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const envKey = process.env.ADMIN_SECRET || "milkfresh-admin-2026";
  return adminKey === envKey;
}

const settingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
});

// GET current settings
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.isActive, true))
      .limit(1);

    if (settings.length === 0) {
      return NextResponse.json({ configured: false, settings: null });
    }

    // Mask the password for display
    const s = settings[0];
    return NextResponse.json({
      configured: true,
      settings: {
        id: s.id,
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        smtpSecure: s.smtpSecure,
        smtpUser: s.smtpUser,
        smtpPass: "•".repeat(Math.min(s.smtpPass.length, 20)),
        fromName: s.fromName,
        fromEmail: s.fromEmail,
        updatedAt: s.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get email settings error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

// POST — save / update settings
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = settingsSchema.parse(body);

    // Deactivate all existing settings
    await db
      .update(emailSettings)
      .set({ isActive: false })
      .where(eq(emailSettings.isActive, true));

    // Insert new active settings
    await db.insert(emailSettings).values({
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpSecure: data.smtpSecure,
      smtpUser: data.smtpUser,
      smtpPass: data.smtpPass,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      isActive: true,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Email settings saved successfully.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Save email settings error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
