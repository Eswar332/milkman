import "dotenv/config";
import { db } from "./index";
import { products } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  await db.insert(products).values([
    {
      name: "Fresh Cow Milk",
      description: "Pure farm fresh cow milk",
      price: "60.00",
      image: "/products/milk.jpg",
      category: "Milk",
      stock: 100,
      unit: "Litre",
      isActive: true,
    },
    {
      name: "Paneer",
      description: "Fresh homemade paneer",
      price: "320.00",
      image: "/products/paneer.jpg",
      category: "Paneer",
      stock: 50,
      unit: "Kg",
      isActive: true,
    },
    {
      name: "Curd",
      description: "Creamy fresh curd",
      price: "80.00",
      image: "/products/curd.jpg",
      category: "Curd",
      stock: 80,
      unit: "Kg",
      isActive: true,
    },
    {
      name: "Butter",
      description: "Organic butter",
      price: "550.00",
      image: "/products/butter.jpg",
      category: "Butter",
      stock: 40,
      unit: "Kg",
      isActive: true,
    },
    {
      name: "Ghee",
      description: "Pure desi ghee",
      price: "850.00",
      image: "/products/ghee.jpg",
      category: "Ghee",
      stock: 30,
      unit: "Litre",
      isActive: true,
    }
  ]);

  console.log("✅ Database seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});