"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-3xl">🥛</span>
              <span className="text-xl font-bold text-white">
                Milk<span className="text-green-400">Fresh</span>
              </span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Premium dairy products delivered fresh to your doorstep. We source
              directly from local farms to ensure the highest quality and
              freshness.
            </p>
            <div className="flex space-x-4">
              <span className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition cursor-pointer">
                📘
              </span>
              <span className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition cursor-pointer">
                📷
              </span>
              <span className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition cursor-pointer">
                🐦
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="hover:text-white transition">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <span>📧</span>
                <span>dimmiribheemarao@gmail.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📞</span>
                <span>+91 8374634456</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📍</span>
                <span>Sariyapalli Village</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© 2026 MilkFresh. All rights reserved. Fresh dairy, delivered with care.</p>
        </div>
      </div>
    </footer>
  );
}
