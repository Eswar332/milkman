import { db } from "@/db";
import { orders, orderTracking, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendStatusUpdateNotification } from "@/lib/email";

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const envKey = process.env.ADMIN_SECRET || "milkfresh-admin-2026";
  return adminKey === envKey;
}

const updateSchema = z.object({
  orderId: z.number(),
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
  trackingDescription: z.string().min(1),
  trackingLocation: z.string().optional(),
  trackingNumber: z.string().optional(),
  paymentStatus: z
    .enum(["pending", "paid", "failed", "refunded", "cod"])
    .optional(),
});

// Status labels for the tracking timeline
const statusLabels: Record<string, string> = {
  pending: "Order Pending",
  confirmed: "Order Confirmed",
  processing: "Order Processing",
  shipped: "Order Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Order Delivered",
  cancelled: "Order Cancelled",
};

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    // Verify the order exists and get customer info
    const existing = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
      })
      .from(orders)
      .where(eq(orders.id, data.orderId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const order = existing[0];

    // Get customer details for notification
    const customerResult = await db
      .select({ name: customers.name, email: customers.email })
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1);

    // Update order status
    const updateData: Record<string, unknown> = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.trackingNumber) {
      updateData.trackingNumber = data.trackingNumber;
    }

    if (data.paymentStatus) {
      updateData.paymentStatus = data.paymentStatus;
    }

    await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, data.orderId));

    // Add tracking timeline entry
    const statusLabel = statusLabels[data.status] || data.status;

    await db.insert(orderTracking).values({
      orderId: data.orderId,
      status: statusLabel,
      description: data.trackingDescription,
      location: data.trackingLocation || null,
    });

    // Send in-app notification to the customer
    if (customerResult.length > 0) {
      const customer = customerResult[0];
      await sendStatusUpdateNotification({
        customerId: order.customerId,
        customerName: customer.name,
        customerEmail: customer.email,
        orderNumber: order.orderNumber,
        newStatus: statusLabel,
        description: data.trackingDescription,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Order updated to "${statusLabel}" successfully.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
