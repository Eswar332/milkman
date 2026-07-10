import { db } from "@/db";
import {
  orders,
  orderItems,
  orderTracking,
  products,
  customers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Admin password check (simple header-based for demo)
function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const envKey = process.env.ADMIN_SECRET || "milkfresh-admin-2026";
  return adminKey === envKey;
}

// GET all orders (admin view)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all orders with customer details
    const allOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        shippingAddress: orders.shippingAddress,
        shippingCity: orders.shippingCity,
        shippingState: orders.shippingState,
        shippingZip: orders.shippingZip,
        trackingNumber: orders.trackingNumber,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerId: orders.customerId,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));

    // If no orders, return empty array immediately
    if (allOrders.length === 0) {
      return NextResponse.json([]);
    }

    // Attach items & tracking to each order
    const enriched = await Promise.all(
      allOrders.map(async (order) => {
        let items: Array<{
          id: number;
          productId: number;
          quantity: number;
          unitPrice: string;
          totalPrice: string;
          productName: string;
          productImage: string;
        }> = [];

        try {
          items = await db
            .select({
              id: orderItems.id,
              productId: orderItems.productId,
              quantity: orderItems.quantity,
              unitPrice: orderItems.unitPrice,
              totalPrice: orderItems.totalPrice,
              productName: products.name,
              productImage: products.image,
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, order.id));
        } catch {
          // If items query fails, continue with empty array
        }

        let tracking: Array<{
          id: number;
          orderId: number;
          status: string;
          description: string;
          location: string | null;
          createdAt: Date;
        }> = [];

        try {
          tracking = await db
            .select()
            .from(orderTracking)
            .where(eq(orderTracking.orderId, order.id))
            .orderBy(desc(orderTracking.createdAt));
        } catch {
          // If tracking query fails, continue with empty array
        }

        return {
          ...order,
          customerName: order.customerName ?? "Unknown",
          customerEmail: order.customerEmail ?? "—",
          customerPhone: order.customerPhone ?? null,
          items,
          tracking,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Admin orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
