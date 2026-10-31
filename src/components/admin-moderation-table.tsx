"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CattleListing, ListingStatus } from "@/types/database";
import { archiveListingByAdminAction } from "@/actions/admin";
import { formatINR } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ExternalLink,
  Archive,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";

interface AdminModerationTableProps {
  initialListings: CattleListing[];
}

export function AdminModerationTable({
  initialListings,
}: AdminModerationTableProps) {
  const router = useRouter();
  const [listings, setListings] = useState<CattleListing[]>(initialListings);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isArchivingId, setIsArchivingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter listings by status and search query
  const filteredListings = listings.filter((item) => {
    // Status filter
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBreed = item.breed.toLowerCase().includes(q);
      const matchSeller = item.seller?.full_name?.toLowerCase().includes(q) || false;
      const matchLocation =
        item.district.toLowerCase().includes(q) || item.state.toLowerCase().includes(q);
      const matchType = item.animal_type.toLowerCase().includes(q);
      return matchTitle || matchBreed || matchSeller || matchLocation || matchType;
    }

    return true;
  });

  const handleConfirmArchive = async (listing: CattleListing) => {
    setIsArchivingId(listing.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await archiveListingByAdminAction(listing.id);

      if (result.success) {
        // Update local listing status immediately
        setListings((prev) =>
          prev.map((item) =>
            item.id === listing.id
              ? { ...item, status: "archived" as ListingStatus }
              : item
          )
        );
        setActionSuccess(
          `Listing "${listing.title}" has been successfully archived and unlisted from the marketplace.`
        );
        setConfirmingId(null);
        router.refresh();
      } else {
        setActionError(result.error || "Failed to archive listing.");
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsArchivingId(null);
    }
  };

  const getStatusBadgeVariant = (status: ListingStatus) => {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "draft";
      case "sold":
        return "sold";
      case "archived":
        return "archived";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Alerts */}
      {actionSuccess && (
        <Alert variant="default" className="border-emerald-300 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <div className="flex-1">
            <AlertTitle className="text-xs font-bold">Listing Archived</AlertTitle>
            <AlertDescription className="text-xs text-emerald-800">
              {actionSuccess}
            </AlertDescription>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
            title="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex-1">
            <AlertTitle className="text-xs font-bold">Action Failed</AlertTitle>
            <AlertDescription className="text-xs">{actionError}</AlertDescription>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-700 hover:text-red-950 p-1"
            title="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* Controls: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search listings by title, breed, seller, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All", count: listings.length },
            {
              id: "published",
              label: "Published",
              count: listings.filter((l) => l.status === "published").length,
            },
            {
              id: "archived",
              label: "Archived",
              count: listings.filter((l) => l.status === "archived").length,
            },
            {
              id: "sold",
              label: "Sold",
              count: listings.filter((l) => l.status === "sold").length,
            },
            {
              id: "draft",
              label: "Draft",
              count: listings.filter((l) => l.status === "draft").length,
            },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-forest text-cream font-semibold shadow-xs"
                    : "bg-surface text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-forest-dark text-cream" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Moderation Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
        {filteredListings.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Archive className="h-6 w-6 text-neutral-400" />}
              title="No Listings Found"
              description="No livestock listings match your current filter or search criteria."
              action={
                searchQuery || statusFilter !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-700 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Livestock Details</th>
                  <th className="py-3 px-3">Category & Breed</th>
                  <th className="py-3 px-3">Expected Price</th>
                  <th className="py-3 px-4">Seller & Location</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredListings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="hover:bg-neutral-50/60 transition-colors"
                  >
                    {/* Livestock Title & Date */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="space-y-1">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="font-semibold text-neutral-900 hover:text-forest transition-colors line-clamp-1 flex items-center gap-1"
                          title={listing.title}
                        >
                          <span>{listing.title}</span>
                          <ExternalLink className="h-3 w-3 text-neutral-400 shrink-0" />
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(listing.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            ID: {listing.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category & Breed */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <span className="capitalize font-semibold text-neutral-800">
                          {listing.breed}
                        </span>
                        <div className="text-[11px] text-neutral-500 capitalize">
                          {listing.animal_type} • {listing.gender}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-neutral-900 text-sm">
                        {formatINR(listing.price_inr)}
                      </span>
                    </td>

                    {/* Seller & Location */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-neutral-900">
                          {listing.seller?.full_name || "Verified Farmer"}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
                          <span>
                            {listing.district}, {listing.state}
                          </span>
                        </div>
                        {listing.seller?.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-mono">
                            <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{listing.seller.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge
                        variant={getStatusBadgeVariant(listing.status)}
                        className="text-[11px] capitalize font-semibold"
                      >
                        {listing.status}
                      </Badge>
                    </td>

                    {/* Moderation Actions with Confirmation */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details Link */}
                        <Link href={`/listings/${listing.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-neutral-700"
                          >
                            View
                          </Button>
                        </Link>

                        {/* Archive Action with Confirmation Step */}
                        {listing.status !== "archived" ? (
                          confirmingId === listing.id ? (
                            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-md p-1 shadow-xs animate-in fade-in">
                              <span className="text-[11px] font-semibold text-red-800 px-1">
                                Confirm?
                              </span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 px-2 text-xs font-semibold"
                                disabled={isArchivingId === listing.id}
                                onClick={() => handleConfirmArchive(listing)}
                              >
                                {isArchivingId === listing.id
                                  ? "Archiving..."
                                  : "Yes, Archive"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-neutral-600 hover:text-neutral-900"
                                disabled={isArchivingId === listing.id}
                                onClick={() => setConfirmingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-2.5 text-xs gap-1"
                              onClick={() => {
                                setActionError(null);
                                setConfirmingId(listing.id);
                              }}
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Archive
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-neutral-400 italic font-medium px-2 py-1">
                            Archived
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

