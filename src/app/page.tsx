import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getListingsAction } from "@/actions/listings";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, ShieldCheck, Sparkles } from "lucide-react";

interface HomePageProps {
  searchParams: Promise<{
    type?: string;
    search?: string;
    state?: string;
    district?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
  }>;
}

export async function MarketplaceContent({ searchParams }: HomePageProps) {
  await connection();
  const params = await searchParams;
  const currentType = params.type || "all";
  const currentSearch = params.search || "";
  const minPrice = params.min_price ? parseInt(params.min_price, 10) : undefined;
  const maxPrice = params.max_price ? parseInt(params.max_price, 10) : undefined;

  const result = await getListingsAction({
    animal_type: currentType === "all" ? undefined : currentType,
    search: currentSearch,
    min_price: minPrice,
    max_price: maxPrice,
  });

  const rawListings = result.listings.length > 0 ? result.listings : DEMO_LISTINGS;
  const isDemo = result.listings.length === 0;

  // Filter demo items locally if searching without db
  const listings = isDemo
    ? rawListings.filter((l) => {
        if (currentType !== "all" && l.animal_type !== currentType) return false;
        if (currentSearch) {
          const s = currentSearch.toLowerCase();
          return (
            l.title.toLowerCase().includes(s) ||
            l.breed.toLowerCase().includes(s) ||
            l.district.toLowerCase().includes(s)
          );
        }
        return true;
      })
    : rawListings;

  const categories = [
    { id: "all", label: "All Livestock", icon: "🐾" },
    { id: "cow", label: "Cows", icon: "🐄" },
    { id: "buffalo", label: "Buffaloes", icon: "🐃" },
    { id: "bull", label: "Bulls", icon: "🐂" },
    { id: "calf", label: "Calves", icon: "🍼" },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 to-emerald-950 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-800/80 px-3.5 py-1 text-xs font-semibold text-emerald-200 border border-emerald-700/60 shadow-xs">
            <Sparkles className="h-3.5 w-3.5" /> Direct Farmer-to-Buyer Marketplace
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Buy & Sell Cattle Across India
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Direct livestock marketplace connecting verified dairy farmers. Guaranteed zero brokerage, whole INR pricing, and strict contact privacy.
          </p>

          {/* Search Box */}
          <form method="GET" action="/" className="mx-auto mt-6 max-w-2xl flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                name="search"
                defaultValue={currentSearch}
                placeholder="Search breed (e.g. Sahiwal, Murrah, Gir) or location..."
                className="pl-10 h-12 bg-white text-neutral-900 placeholder:text-neutral-400 border-0 shadow-lg text-sm rounded-xl"
              />
              {currentType !== "all" && (
                <input type="hidden" name="type" value={currentType} />
              )}
            </div>
            <Button type="submit" size="lg" className="h-12 px-6 rounded-xl font-semibold shadow-lg">
              Search Livestock
            </Button>
          </form>
        </div>
      </section>

      {/* Main Marketplace Area */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isActive = currentType === cat.id;
            return (
              <Link
                key={cat.id}
                href={`/?type=${cat.id}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ""}`}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-xs ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Feed Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Live Marketplace Feed
            </h2>
            <p className="text-xs text-neutral-500">
              Showing {listings.length} verified listings
              {isDemo && " (Demo dataset active)"}
            </p>
          </div>

          <Link href="/listings/create">
            <Button size="sm" variant="outline" className="gap-1.5 text-emerald-800">
              <PlusCircle className="h-4 w-4 text-emerald-600" /> Post Listing
            </Button>
          </Link>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-12 text-center bg-white">
            <span className="text-5xl">🔍</span>
            <h3 className="mt-3 text-lg font-bold text-neutral-900">
              No cattle listings match your filters
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Try searching with a broader keyword or select another animal category.
            </p>
            <div className="mt-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  Clear Filters
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Trust & Safety Callout Banner */}
        <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Seller Contact Privacy
                </h4>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  Farmers can keep mobile numbers protected. Numbers are masked at the database level against commercial scrapers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                ₹
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Zero Brokerage & Commission
                </h4>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  Transact directly between cattle owners and buyers with zero middleman commissions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                📸
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">
                  Optimized for Rural Bandwidth
                </h4>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  Automatic in-browser WebP compression reduces 5MB camera photos to fast 300KB images.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-12 px-4 text-center text-sm text-neutral-500">
          Loading marketplace feed...
        </div>
      }
    >
      <MarketplaceContent searchParams={searchParams} />
    </Suspense>
  );
}
