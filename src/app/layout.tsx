import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { NavbarServer, NavbarFallback } from "@/components/navbar-server";

export const metadata: Metadata = {
  title: "Cattle Exchange — Indian Livestock Marketplace",
  description:
    "Direct digital marketplace connecting cattle buyers and sellers across India with verified livestock specifications and privacy controls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50/30 text-neutral-900 font-sans">
        <Suspense fallback={<NavbarFallback />}>
          <NavbarServer />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-neutral-200 bg-white py-6 text-center text-xs text-neutral-500">
          <div className="container mx-auto px-4">
            <p className="font-semibold text-neutral-700">Cattle Exchange</p>
            <p className="mt-1">
              India&apos;s Trusted Direct Livestock Marketplace. Zero Brokerage.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
