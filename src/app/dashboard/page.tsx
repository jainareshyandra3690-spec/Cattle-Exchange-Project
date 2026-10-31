import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentUserAction } from "@/actions/auth";
import { getListingsAction, updateListingStatusAction, deleteListingAction } from "@/actions/listings";
import { updateProfileAction } from "@/actions/profile";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle, User, CheckCircle2, Trash2, Pencil } from "lucide-react";

async function DashboardContent() {
  await connection();
  const authData = await getCurrentUserAction();

  if (!authData?.user) {
    redirect("/auth/sign-in?redirect=/dashboard");
  }

  const { user, profile } = authData;
  const userListingsData = await getListingsAction({ seller_id: user.id });
  const listings = userListingsData.listings;

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">
              Farmer Dashboard
            </h1>
            {(user.app_metadata?.role === "admin" || profile?.role === "admin") && (
              <Badge variant="destructive" className="font-semibold text-xs">
                ADMIN
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your livestock listings, buyer inquiries, and profile settings
          </p>
        </div>

        <Link href="/listings/create">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Post New Animal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile & Privacy Settings Card */}
        <div className="lg:col-span-1">
          <Card className="border-neutral-200 shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg font-bold">
                  Profile & Privacy Settings
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Control your public visibility and contact preferences
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await updateProfileAction(formData);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">
                    Full Name
                  </label>
                  <Input
                    name="full_name"
                    defaultValue={profile?.full_name || ""}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">
                    Mobile Phone
                  </label>
                  <Input
                    name="phone"
                    defaultValue={profile?.phone || ""}
                    required
                  />
                </div>

                {/* Contact Privacy Toggle (ADR-008) */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="phone_public"
                      name="phone_public"
                      defaultChecked={profile?.phone_public}
                      className="mt-0.5 h-4 w-4 rounded-sm border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="phone_public" className="cursor-pointer text-xs font-semibold text-neutral-900 leading-snug">
                      Allow public buyers to view my phone number
                    </label>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-tight pl-6.5">
                    When unchecked, your phone number is redacted at the database level to prevent telemarketing scraping.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      State
                    </label>
                    <Input
                      name="state"
                      defaultValue={profile?.state || ""}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      District
                    </label>
                    <Input
                      name="district"
                      defaultValue={profile?.district || ""}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="outline" className="w-full text-xs font-semibold">
                  Update Profile Details
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Listings Management */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900">
                Your Cattle Listings ({listings.length})
              </h2>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-8 text-center bg-white">
                <span className="text-4xl">🌾</span>
                <h3 className="mt-2 text-base font-bold text-neutral-900">
                  No listings created yet
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Post your cows, buffaloes, or calves to start connecting with buyers.
                </p>
                <div className="mt-4">
                  <Link href="/listings/create">
                    <Button size="sm">Create First Listing</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listings.map((item) => (
                  <div key={item.id} className="relative group flex flex-col">
                    <ListingCard listing={item} />

                    {/* Quick Management Toolbar */}
                    <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200">
                      <Link href={`/listings/${item.id}/edit`}>
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-neutral-700 hover:text-neutral-900">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </Link>

                      {item.status === "published" && (
                        <form
                          action={async () => {
                            "use server";
                            await updateListingStatusAction(item.id, "sold");
                          }}
                        >
                          <Button size="sm" variant="ghost" type="submit" className="text-xs h-7 gap-1 text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Mark Sold
                          </Button>
                        </form>
                      )}

                      {item.status === "draft" && (
                        <form
                          action={async () => {
                            "use server";
                            await updateListingStatusAction(item.id, "published");
                          }}
                        >
                          <Button size="sm" variant="ghost" type="submit" className="text-xs h-7 text-emerald-700 font-semibold">
                            Publish Now
                          </Button>
                        </form>
                      )}

                      <form
                        action={async () => {
                          "use server";
                          await deleteListingAction(item.id);
                        }}
                      >
                        <Button size="sm" variant="ghost" type="submit" className="text-xs h-7 text-red-600 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-12 px-4 text-center text-sm text-neutral-500">
          Loading farmer dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

