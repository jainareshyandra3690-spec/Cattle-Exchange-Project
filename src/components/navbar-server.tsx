import React from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUserAction } from "@/actions/auth";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { PlusCircle, Compass } from "lucide-react";

/**
 * Genuinely static, unauthenticated Navbar fallback for Next.js 16 prerendering.
 * Does not call Supabase, read cookies, or invoke authentication actions.
 */
export function NavbarFallback() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs">
            🐄
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-neutral-900 leading-none">
              Cattle Exchange
            </span>
            <span className="text-xs font-medium text-emerald-700 leading-tight">
              Verified Livestock Marketplace
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors text-emerald-700 font-semibold"
          >
            <Compass className="h-4 w-4" />
            Marketplace
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link href="/listings/create">
            <Button size="sm" className="gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              Sell Cattle
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button variant="outline" size="sm">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Server Component leaf that dynamically retrieves the authenticated user session
 * inside a <Suspense> boundary, preserving static root layout prerendering.
 * Defers execution to request time via connection() to safely handle Supabase
 * Auth token expiration timestamp checks (Date.now()).
 */
export async function NavbarServer() {
  await connection();
  const authData = await getCurrentUserAction();
  return <Navbar user={authData?.user} profile={authData?.profile} />;
}

