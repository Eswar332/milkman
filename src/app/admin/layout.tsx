import type { ReactNode } from "react";

export const metadata = {
  title: "MilkFresh Admin Dashboard",
  description: "Admin panel for managing orders and tracking",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
