import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Champion SJP — Admin",
  description: "Sales Journey Plan — PT Multi Prima Sejahtera Tbk",
  icons: { icon: "/champion.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
