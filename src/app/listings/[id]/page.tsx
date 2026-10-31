import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getListingByIdAction, updateListingStatusAction, deleteListingAction } from "@/actions/listings";
import { archiveListingByAdminAction } from "@/actions/admin";
import { getCurrentUserAction } from "@/actions/auth";
import { formatINR } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Droplets,
  Calendar,
  Phone,
  MessageCircle,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Trash2,
  CheckCircle,
  Pencil,
} from "lucide-react";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

async function ListingDetailContent({ params }: ListingPageProps) {
  await connection();
  const { id } = await params;
  const listing = await getListingByIdAction(id);

  if (!listing) {
    notFound();
  }

  const authData = await getCurrentUserAction();
  const currentUser = authData?.user;
  const currentProfile = authData?.profile;

  const isOwner = currentUser?.id === listing.seller_id;
  const isAdmin = currentUser?.app_metadata?.role === "admin" || currentProfile?.role === "admin";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const images = listing.images || [];
  const coverImage = images[0];

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 sm:px-6">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>

        {/* Owner / Admin Management controls */}
        <div className="flex items-center gap-2">
          {(isOwner || isAdmin) && (
            <Link href={`/listings/${listing.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-4 w-4" />
                Edit Listing
              </Button>
            </Link>
          )}

          {isOwner && (
            <>
              {listing.status === "published" && (
                <form
                  action={async () => {
                    "use server";
                    await updateListingStatusAction(listing.id, "sold");
                  }}
                >
                  <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-emerald-800">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Mark as Sold
                  </Button>
                </form>
              )}
              <form
                action={async () => {
                  "use server";
                  await deleteListingAction(listing.id);
                }}
              >
                <Button variant="destructive" size="sm" type="submit" className="gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </form>
            </>
          )}

          {isAdmin && !isOwner && listing.status !== "archived" && (
            <form
              action={async () => {
                "use server";
                await archiveListingByAdminAction(listing.id);
              }}
            >
              <Button variant="destructive" size="sm" type="submit">
                Archive Listing (Admin)
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Photos & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Photo Gallery */}
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
            <div className="relative aspect-16/10 w-full bg-neutral-900/5">
              {coverImage ? (
                <Image
                  src={`${supabaseUrl}/storage/v1/object/public/listing-images/${coverImage.storage_path}`}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400">
                  <span className="text-6xl">🐄</span>
                  <span className="mt-2 text-sm">No Photographs Uploaded</span>
                </div>
              )}

              <div className="absolute top-4 left-4">
                {listing.status === "sold" ? (
                  <Badge variant="destructive" className="text-xs px-2.5 py-1 font-bold">
                    SOLD
                  </Badge>
                ) : listing.status === "draft" ? (
                  <Badge variant="secondary" className="text-xs px-2.5 py-1 font-semibold">
                    DRAFT
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs px-2.5 py-1 font-semibold uppercase">
                    {listing.animal_type}
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex gap-2 p-3 bg-white border-t border-neutral-200 overflow-x-auto">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative h-16 w-16 shrink-0 rounded-md border border-neutral-200 overflow-hidden"
                  >
                    <Image
                      src={`${supabaseUrl}/storage/v1/object/public/listing-images/${img.storage_path}`}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Listing Specs Header */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 uppercase tracking-wide">
              <span>{listing.breed}</span>
              <span>•</span>
              <span className="capitalize">{listing.gender}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-neutral-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-sm text-neutral-500 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" />
              {listing.district}, {listing.state}
            </p>
          </div>

          {/* Key Livestock Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div>
              <span className="text-xs text-neutral-500">Category</span>
              <p className="text-sm font-bold text-neutral-900 capitalize">
                {listing.animal_type}
              </p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Breed</span>
              <p className="text-sm font-bold text-neutral-900">{listing.breed}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Age</span>
              <p className="text-sm font-bold text-neutral-900 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                {listing.age_months !== null
                  ? `${Math.floor(listing.age_months / 12)}y ${listing.age_months % 12}m`
                  : "Not specified"}
              </p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Milk Yield</span>
              <p className="text-sm font-bold text-emerald-900 flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-emerald-600" />
                {listing.milk_yield_liters_per_day !== null
                  ? `${listing.milk_yield_liters_per_day} L/day`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900 mb-3">
              Animal Health & Details
            </h2>
            <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
              {listing.description}
            </p>
          </div>
        </div>

        {/* Right Column: Price & Seller Contact Card */}
        <div className="space-y-6">
          <Card className="border-neutral-200 shadow-md sticky top-24">
            <CardHeader className="pb-4">
              <span className="text-xs font-semibold text-neutral-500 uppercase">
                Expected Price
              </span>
              <CardTitle className="text-3xl font-extrabold text-neutral-900">
                {formatINR(listing.price_inr)}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 pt-0">
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
                    {listing.seller?.full_name?.charAt(0) || "F"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">
                      {listing.seller?.full_name || "Verified Farmer"}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {listing.seller?.district}, {listing.seller?.state}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seller Phone Privacy Section */}
              <div className="space-y-3 pt-2">
                {listing.seller?.phone ? (
                  // Phone is exposed (either phone_public is true, or viewer is owner/admin)
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        <span>{listing.seller.phone}</span>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        VERIFIED
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a href={`tel:${listing.seller.phone}`}>
                        <Button className="w-full gap-2">
                          <Phone className="h-4 w-4" /> Call
                        </Button>
                      </a>
                      <a
                        href={`https://wa.me/${listing.seller.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="w-full gap-2 text-emerald-700 border-emerald-300">
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  // Phone is private (SQL-level redaction in public_profiles)
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-neutral-600">
                      <Lock className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold text-neutral-800">
                      Private Contact
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-500 leading-tight">
                      The seller has chosen to keep their phone number private.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-100 pt-3 text-[11px] text-neutral-500 flex items-center gap-1.5 justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero commission direct marketplace</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ListingDetailPage({ params }: ListingPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-12 px-4 text-center text-sm text-neutral-500">
          Loading livestock details...
        </div>
      }
    >
      <ListingDetailContent params={params} />
    </Suspense>
  );
}

