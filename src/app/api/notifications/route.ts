import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET notifications for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      );
    }

    const customerNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.customerId, parseInt(customerId)))
      .orderBy(desc(notifications.createdAt));

    // Count unread
    const unreadResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.customerId, parseInt(customerId)),
          eq(notifications.isRead, false)
        )
      );

    const unreadCount = unreadResult[0]?.count ?? 0;

    return NextResponse.json({ notifications: customerNotifs, unreadCount });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
