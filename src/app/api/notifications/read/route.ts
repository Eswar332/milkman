import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Mark notification(s) as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, notificationId, markAll } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      );
    }

    if (markAll) {
      // Mark all as read for this customer
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.customerId, customerId),
            eq(notifications.isRead, false)
          )
        );
    } else if (notificationId) {
      // Mark single notification as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.customerId, customerId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
