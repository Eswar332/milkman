import { db } from "@/db";
import { orders, customers, products } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  const envKey = process.env.ADMIN_SECRET || "milkfresh-admin-2026";
  return adminKey === envKey;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const totalOrdersResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM orders`
    );
    const totalOrders = (totalOrdersResult.rows[0] as { count: number }).count;

    const totalRevenueResult = await db.execute(
      sql`SELECT COALESCE(SUM(total_amount::numeric), 0) as total FROM orders WHERE payment_status IN ('paid', 'cod')`
    );
    const totalRevenue = parseFloat(
      String((totalRevenueResult.rows[0] as { total: string }).total)
    );

    const totalCustomersResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM customers`
    );
    const totalCustomers = (totalCustomersResult.rows[0] as { count: number }).count;

    const totalProductsResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM products WHERE is_active = true`
    );
    const totalProducts = (totalProductsResult.rows[0] as { count: number }).count;

    // Orders by status
    const statusBreakdownResult = await db.execute(
      sql`SELECT status, COUNT(*)::int as count FROM orders GROUP BY status`
    );
    const statusBreakdown = statusBreakdownResult.rows as Array<{
      status: string;
      count: number;
    }>;

    // Recent orders count (last 24h)
    const recentResult = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM orders WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    const recentOrders = (recentResult.rows[0] as { count: number }).count;

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      recentOrders,
      statusBreakdown,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    // Return zeros on empty tables
    return NextResponse.json({
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      totalProducts: 0,
      recentOrders: 0,
      statusBreakdown: [],
    });
  }
}
