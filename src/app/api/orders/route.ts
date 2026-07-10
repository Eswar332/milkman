import { db } from "@/db";
import { orders, orderItems, orderTracking, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generateOrderNumber } from "@/lib/utils";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { z } from "zod";

const orderSchema = z.object({
  customerId: z.number(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  items: z.array(
    z.object({
      productId: z.number(),
      productName: z.string(),
      quantity: z.number().min(1),
      unitPrice: z.number(),
    })
  ),
  paymentMethod: z.enum(["credit_card", "debit_card", "upi", "cod", "net_banking"]),
  shippingAddress: z.string(),
  shippingCity: z.string(),
  shippingState: z.string(),
  shippingZip: z.string(),
  notes: z.string().optional(),
  // card details for simulation - not stored
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
  upiId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = orderSchema.parse(body);

    // Calculate total
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const orderNumber = generateOrderNumber();

    // Simulate payment processing
    const paymentStatus =
      data.paymentMethod === "cod" ? "cod" : "paid";

    // Create order
    const orderResult = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId: data.customerId,
        status: "confirmed",
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: data.paymentMethod,
        paymentStatus,
        shippingAddress: data.shippingAddress,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingZip: data.shippingZip,
        notes: data.notes || null,
      })
      .returning();

    const order = orderResult[0];

    // Create order items
    for (const item of data.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: (item.unitPrice * item.quantity).toFixed(2),
      });

      // Decrease stock
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (product.length > 0) {
        await db
          .update(products)
          .set({ stock: product[0].stock - item.quantity })
          .where(eq(products.id, item.productId));
      }
    }

    // Create initial tracking entry
    await db.insert(orderTracking).values({
      orderId: order.id,
      status: "Order Placed",
      description: `Your order #${orderNumber} has been placed successfully and payment has been ${paymentStatus === "cod" ? "set to Cash on Delivery" : "confirmed"}.`,
      location: "Online",
    });

    await db.insert(orderTracking).values({
      orderId: order.id,
      status: "Order Confirmed",
      description:
        "Your order has been confirmed and is being prepared for processing.",
      location: "Warehouse",
    });

    // Send confirmation email + save in-app notification
    await sendOrderConfirmationEmail({
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      orderNumber,
      items: data.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: (item.unitPrice * item.quantity).toFixed(2),
      })),
      totalAmount: totalAmount.toFixed(2),
      paymentMethod: data.paymentMethod.replace("_", " ").toUpperCase(),
      shippingAddress: `${data.shippingAddress}, ${data.shippingCity}, ${data.shippingState} ${data.shippingZip}`,
    });

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId: order.id,
      totalAmount: totalAmount.toFixed(2),
      paymentStatus,
      message: "Order placed successfully! Confirmation email sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid order data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Order error:", error);
    return NextResponse.json(
      { error: "Failed to place order" },
      { status: 500 }
    );
  }
}

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

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, parseInt(customerId)))
      .orderBy(desc(orders.createdAt));

    // Get items for each order
    const ordersWithItems = await Promise.all(
      customerOrders.map(async (order) => {
        const items = await db
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

        return { ...order, items };
      })
    );

    return NextResponse.json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
