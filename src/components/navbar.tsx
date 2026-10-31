"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, User, LogOut, Compass, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/actions/auth";

interface NavbarProps {
  user?: {
    id: string;
    email?: string;
    app_metadata?: {
      role?: string;
      [key: string]: unknown;
    };
  } | null;
  profile?: {
    full_name?: string;
    role?: string;
  } | null;
}

export function Navbar({ user, profile }: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = Boolean(user && (user.app_metadata?.role === "admin" || profile?.role === "admin"));

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
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              pathname === "/" ? "text-emerald-700 font-semibold" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <Compass className="h-4 w-4" />
            Marketplace
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "text-emerald-700 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <User className="h-4 w-4" />
              My Listings & Profile
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                pathname === "/admin"
                  ? "text-red-700 font-semibold"
                  : "text-neutral-600 hover:text-red-700"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-red-600" />
              Admin Deck
            </Link>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link href="/listings/create">
            <Button size="sm" className="gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              Sell Cattle
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-neutral-900">
                  {profile?.full_name || "Farmer"}
                </span>
                {isAdmin && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1 self-end">
                    ADMIN
                  </Badge>
                )}
              </div>
              <form action={signOutAction}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  title="Sign Out"
                  className="text-neutral-600 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Sign Out</span>
                </Button>
              </form>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}

