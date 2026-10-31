import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/formatters";
import type { CattleListing } from "@/types/database";
import { MapPin, Droplets, Calendar } from "lucide-react";

interface ListingCardProps {
  listing: CattleListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  // Sort images by sort_order ascending; index 0 is cover image
  const coverImage = listing.images?.find((img) => img.sort_order === 0) || listing.images?.[0];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const imageUrl = coverImage
    ? `${supabaseUrl}/storage/v1/object/public/listing-images/${coverImage.storage_path}`
    : null;

  return (
    <Link href={`/listings/${listing.id}`} className="group block focus:outline-hidden">
      <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:border-emerald-300">
        {/* Photo Container */}
        <div className="relative aspect-4/3 w-full bg-neutral-100 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400">
              <span className="text-4xl">🐄</span>
              <span className="mt-1 text-xs">No Photo Available</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2.5 left-2.5">
            {listing.status === "sold" ? (
              <Badge variant="destructive" className="font-bold tracking-wider">
                SOLD
              </Badge>
            ) : listing.status === "draft" ? (
              <Badge variant="secondary" className="font-medium">
                DRAFT
              </Badge>
            ) : (
              <Badge variant="success" className="font-medium">
                {listing.animal_type.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                {listing.breed}
              </span>
              <span className="text-xs text-neutral-500 capitalize">
                {listing.gender}
              </span>
            </div>

            <h3 className="mt-1 text-base font-semibold text-neutral-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
              {listing.title}
            </h3>

            {/* Attributes row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
              {listing.milk_yield_liters_per_day !== null && (
                <div className="flex items-center gap-1 font-medium text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-sm">
                  <Droplets className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{listing.milk_yield_liters_per_day} L/day</span>
                </div>
              )}
              {listing.age_months !== null && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                  <span>
                    {Math.floor(listing.age_months / 12) > 0
                      ? `${Math.floor(listing.age_months / 12)}y ${listing.age_months % 12}m`
                      : `${listing.age_months} months`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span className="truncate max-w-[140px]">
                {listing.district}, {listing.state}
              </span>
            </div>
            <div className="text-base font-bold text-neutral-900">
              {formatINR(listing.price_inr)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

