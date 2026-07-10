"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore, type Product } from "@/context/StoreContext";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useStore();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const featured = products.slice(0, 4);
  const categories = [
    { name: "Milk", emoji: "🥛", desc: "Farm fresh whole & low-fat milk" },
    { name: "Yogurt", emoji: "🍶", desc: "Creamy natural & Greek yogurt" },
    { name: "Cheese", emoji: "🧀", desc: "Aged cheddar, gouda & more" },
    { name: "Butter", emoji: "🧈", desc: "Salted & unsalted butter" },
    { name: "Cream", emoji: "🍦", desc: "Heavy cream & whipping cream" },
    { name: "Ghee", emoji: "✨", desc: "Pure clarified butter" },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <Image
          src="/products/hero-milk.jpg"
          alt="Fresh dairy products"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-blue-800/50" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl animate-fade-in">
              <span className="inline-block bg-green-500 text-white text-sm font-semibold px-4 py-1 rounded-full mb-4">
                🌿 100% Farm Fresh
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Premium Dairy
                <br />
                <span className="text-green-400">Delivered Fresh</span>
              </h1>
              <p className="text-lg text-blue-100 mb-8">
                From our farms to your table. Order fresh milk, cheese, yogurt,
                butter and more with fast home delivery and real-time tracking.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-semibold text-lg transition shadow-lg hover:shadow-xl"
                >
                  Shop Now →
                </Link>
                <Link
                  href="/track"
                  className="bg-white/20 backdrop-blur hover:bg-white/30 text-white px-8 py-3 rounded-xl font-semibold text-lg transition border border-white/30"
                >
                  Track Order
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                icon: "🚚",
                title: "Fast Delivery",
                desc: "Same day delivery on orders before 2 PM",
              },
              {
                icon: "❄️",
                title: "Cold Chain",
                desc: "Temperature controlled from farm to door",
              },
              {
                icon: "📱",
                title: "Live Tracking",
                desc: "Track your order status in real-time",
              },
              {
                icon: "💳",
                title: "Easy Payments",
                desc: "Credit cards, UPI, Net Banking & COD",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start space-x-4 p-4 rounded-xl hover:bg-blue-50 transition"
              >
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Browse Categories
            </h2>
            <p className="text-gray-500 mt-2">
              Explore our wide range of dairy products
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href="/products"
                className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition group border border-gray-100"
              >
                <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">
                  {cat.emoji}
                </span>
                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Featured Products
              </h2>
              <p className="text-gray-500 mt-2">
                Our most popular dairy products
              </p>
            </div>
            <Link
              href="/products"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-gray-100 rounded-2xl h-80 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition group"
                >
                  <div className="relative h-48 bg-gray-50 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                      {product.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{product.unit}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-green-600">
                        ₹{product.price}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-2">
              Getting fresh dairy has never been easier
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: "🛒",
                title: "Browse & Order",
                desc: "Choose from our wide range of dairy products",
              },
              {
                step: "2",
                icon: "💳",
                title: "Secure Payment",
                desc: "Pay via Credit Card, UPI, or Cash on Delivery",
              },
              {
                step: "3",
                icon: "📧",
                title: "Get Confirmation",
                desc: "Receive order confirmation on your email",
              },
              {
                step: "4",
                icon: "🚛",
                title: "Track & Receive",
                desc: "Track your order live until it reaches you",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <span className="text-4xl">{s.icon}</span>
                </div>
                <div className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-800 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to get farm-fresh dairy delivered?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of happy customers who enjoy fresh, quality dairy
            products every day.
          </p>
          <Link
            href="/register"
            className="inline-block bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition shadow-lg"
          >
            Get Started – Sign Up Free
          </Link>
        </div>
      </section>
    </div>
  );
}
