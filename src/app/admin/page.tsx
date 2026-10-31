import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUserAction } from "@/actions/auth";
import { getAdminDashboardDataAction } from "@/actions/admin";
import { AdminModerationTable } from "@/components/admin-moderation-table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ShieldAlert,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Archive,
  Users,
  Info,
  BadgeCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Moderation Deck | Cattle Exchange",
  description: "Marketplace operational moderation, listing safeguards, and compliance overview.",
};

export async function AdminDashboardContent() {
  await connection();
  const authData = await getCurrentUserAction();

  // 1. Unauthenticated visitors are redirected to sign-in
  if (!authData?.user) {
    redirect("/auth/sign-in?redirect=/admin");
  }

  const { user, profile } = authData;

  // 2. Strict Server-Side Authorization: verify admin claim in JWT app_metadata or database profile
  const isAdmin = user.app_metadata?.role === "admin" || profile?.role === "admin";

  // 3. Deny authenticated non-admin users with a 403 Forbidden Access Denied state
  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-4xl py-16 px-4">
        <Card className="border-red-200 bg-red-50/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-red-900">
                  Access Denied: Administrator Privileges Required
                </CardTitle>
                <CardDescription className="text-sm text-red-700">
                  Your account does not have permission to view or manage the moderation deck.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-700 leading-relaxed">
              This area is strictly restricted to verified Cattle Exchange marketplace administrators.
              Standard farmer and buyer accounts cannot review operational metrics or moderate listings.
            </p>
            <div className="pt-2">
              <Link href="/dashboard">
                <Button variant="outline" className="border-red-300 text-red-900 hover:bg-red-100">
                  Return to Farmer Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Authorized Admin: fetch operational metrics and listing moderation queue
  const adminResponse = await getAdminDashboardDataAction();

  if (!adminResponse.success || !adminResponse.data) {
    return (
      <div className="container mx-auto max-w-7xl py-12 px-4">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error Loading Admin Dashboard</AlertTitle>
          <AlertDescription>
            {adminResponse.error || "Failed to load operational metrics from database."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { metrics, listings, isDemo } = adminResponse.data;

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 space-y-8">
      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Administrator Moderation Deck
            </h1>
            <Badge variant="destructive" className="font-semibold text-xs py-0.5 px-2">
              ADMIN
            </Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Monitor livestock marketplace activity, audit listings, and enforce operational safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1 text-xs py-1 px-2.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Admin Session
          </Badge>
        </div>
      </div>

      {/* Demo Dataset Notice if Active */}
      {isDemo && (
        <Alert className="border-amber-200 bg-amber-50/80 text-amber-900">
          <Info className="h-4 w-4 text-amber-700" />
          <div className="flex-1">
            <AlertTitle className="text-xs font-bold">Demonstration Dataset Active</AlertTitle>
            <AlertDescription className="text-xs text-amber-800">
              The remote database contains no active records or is in initial staging. Displaying sample livestock listings to demonstrate moderation workflows.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Listings */}
        <Card className="border-neutral-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Total Listings
              </span>
              <Layers className="h-4 w-4 text-neutral-500" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {metrics.totalListings}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">All registered livestock</p>
          </CardContent>
        </Card>

        {/* Published Active */}
        <Card className="border-emerald-200 bg-emerald-50/30 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase">
                Published
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-emerald-950">
              {metrics.publishedListings}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-emerald-700">Active in public feed</p>
          </CardContent>
        </Card>

        {/* Sold Cattle */}
        <Card className="border-amber-200 bg-amber-50/20 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase">
                Sold Cattle
              </span>
              <BadgeCheck className="h-4 w-4 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-amber-950">
              {metrics.soldListings}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-amber-700">Completed farmer sales</p>
          </CardContent>
        </Card>

        {/* Archived Listings */}
        <Card className="border-neutral-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 uppercase">
                Archived
              </span>
              <Archive className="h-4 w-4 text-neutral-500" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-800">
              {metrics.archivedListings}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Unlisted by moderation</p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="border-neutral-200 shadow-xs col-span-2 sm:col-span-1">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Registered Users
              </span>
              <Users className="h-4 w-4 text-neutral-500" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">
              {metrics.totalUsers}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-neutral-500">Verified farmer accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Livestock Moderation Queue
            </h2>
            <p className="text-xs text-neutral-500">
              Review published, draft, and reported cattle listings. Archiving immediately removes an item from public search.
            </p>
          </div>
        </div>

        {/* Client-Side Moderation Table with Search, Filter & Confirmation */}
        <AdminModerationTable initialListings={listings} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-16 px-4 text-center">
          <p className="text-sm text-neutral-500">Loading administrator moderation deck...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
