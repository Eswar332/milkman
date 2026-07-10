import { db } from "@/db";
import { products } from "@/db/schema";
import { sql } from "drizzle-orm";

const seedProducts = [
  {
    name: "Farm Fresh Whole Milk",
    description:
      "Pure, creamy whole milk sourced directly from local farms. Rich in calcium, protein, and essential vitamins. Perfect for drinking, cooking, and baking.",
    price: "68.00",
    image: "/images/fresh-milk.jpg",
    category: "Milk",
    stock: 200,
    unit: "1 Litre",
  },
  {
    name: "Natural Greek Yogurt",
    description:
      "Thick, creamy Greek yogurt made from fresh whole milk. Packed with probiotics and protein. Available in plain flavor - perfect with fruits and granola.",
    price: "120.00",
    image: "/images/yogurt.jpg",
    category: "Yogurt",
    stock: 150,
    unit: "400 gm",
  },
  {
    name: "Aged Cheddar Cheese",
    description:
      "Premium aged cheddar cheese with a sharp, rich flavor. Aged for 12 months for the perfect taste. Great for sandwiches, burgers, and cheese boards.",
    price: "349.00",
    image: "/images/cheese.jpg",
    category: "Cheese",
    stock: 100,
    unit: "200 gm",
  },
  {
    name: "Creamy Salted Butter",
    description:
      "Fresh churned salted butter made from pure cream. Rich, golden color with a smooth, creamy texture. Ideal for cooking, baking, and spreading.",
    price: "56.00",
    image: "/images/butter.jpg",
    category: "Butter",
    stock: 180,
    unit: "100 gm",
  },
  {
    name: "Heavy Whipping Cream",
    description:
      "Rich and luxurious heavy cream with 36% milk fat. Perfect for whipping, making sauces, soups, and desserts. Ultra-pasteurized for freshness.",
    price: "85.00",
    image: "/images/cream.jpg",
    category: "Cream",
    stock: 120,
    unit: "200 ml",
  },
  {
    name: "Fresh Paneer",
    description:
      "Soft, fresh paneer (cottage cheese) made from whole milk. Perfect for Indian curries, tikka, and grilled dishes. No preservatives added.",
    price: "99.00",
    image: "/images/paneer.jpg",
    category: "Paneer",
    stock: 80,
    unit: "200 gm",
  },
  {
    name: "Pure Desi Ghee",
    description:
      "Traditional clarified butter made from pure cow milk cream. Rich golden color with a nutty aroma. Perfect for cooking, frying, and traditional recipes.",
    price: "599.00",
    image: "/images/ghee.jpg",
    category: "Ghee",
    stock: 90,
    unit: "500 ml",
  },
  {
    name: "Low-Fat Milk",
    description:
      "Light and refreshing toned milk. All the goodness of whole milk with less fat. Great for health-conscious consumers and everyday use.",
    price: "54.00",
    image: "/images/fresh-milk.jpg",
    category: "Milk",
    stock: 250,
    unit: "1 Litre",
  },
];

export async function seedDatabase() {
  // Check if products already exist
  const existing = await db.execute(
    sql`SELECT COUNT(*) as count FROM products`
  );
  const count = parseInt(
    String((existing.rows[0] as { count: string }).count),
    10
  );

  if (count === 0) {
    for (const product of seedProducts) {
      await db.insert(products).values(product);
    }
    console.log("Seeded database with products");
  }
}
