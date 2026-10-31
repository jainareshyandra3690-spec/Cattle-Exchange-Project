import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getListingByIdAction } from "@/actions/listings";
import { getCurrentUserAction } from "@/actions/auth";
import { ListingEditForm } from "@/components/listing-edit-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShieldAlert } from "lucide-react";

interface ListingEditPageProps {
  params: Promise<{ id: string }>;
}

export async function ListingEditContent({ params }: ListingEditPageProps) {
  await connection();
  const { id } = await params;

  const authData = await getCurrentUserAction();
  if (!authData?.user) {
    redirect(`/auth/sign-in?redirect=/listings/${id}/edit`);
  }

  const listing = await getListingByIdAction(id);
  if (!listing) {
    notFound();
  }

  const isOwner = authData.user.id === listing.seller_id;
  const isAdmin =
    authData.user.app_metadata?.role === "admin" ||
    authData.profile?.role === "admin";

  if (!isOwner && !isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4 sm:px-6">
        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3 text-red-700">
              <ShieldAlert className="h-6 w-6" />
              <div>
                <CardTitle className="text-lg font-bold">Access Denied</CardTitle>
                <CardDescription className="text-xs text-red-600">
                  You do not have permission to edit this listing. Only the listing owner or an administrator can modify it.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href={`/listings/${listing.id}`}>
              <Button variant="outline" size="sm">
                View Listing
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 sm:px-6">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/listings/${listing.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Listing
        </Link>
      </div>

      <ListingEditForm listing={listing} userId={authData.user.id} />
    </div>
  );
}

function ListingEditSkeleton() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4 text-center">
      <p className="text-sm text-neutral-500">Loading listing details...</p>
    </div>
  );
}

export default function ListingEditPage({ params }: ListingEditPageProps) {
  return (
    <Suspense fallback={<ListingEditSkeleton />}>
      <ListingEditContent params={params} />
    </Suspense>
  );
}
