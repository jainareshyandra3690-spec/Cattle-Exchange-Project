"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ImageDropzone } from "@/components/image-dropzone";
import { updateListingAction } from "@/actions/listings";
import type { CattleListing, ListingStatus } from "@/types/database";

interface ListingEditFormProps {
  listing: CattleListing;
  userId: string;
}

export function ListingEditForm({ listing, userId }: ListingEditFormProps) {
  const router = useRouter();

  const [imagePaths, setImagePaths] = useState<string[]>(
    () => listing.images?.map((img) => img.storage_path) || []
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialImages = (listing.images || []).map((img) => ({
    id: img.id,
    storage_path: img.storage_path,
    sort_order: img.sort_order,
  }));

  const processForm = async (
    form: HTMLFormElement,
    overrideStatus?: ListingStatus
  ) => {
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(form);

    const ageRaw = formData.get("age_months");
    const milkRaw = formData.get("milk_yield_liters_per_day");
    const chosenStatus = (overrideStatus ||
      formData.get("status") ||
      listing.status) as ListingStatus;

    const payload = {
      title: formData.get("title"),
      animal_type: formData.get("animal_type"),
      breed: formData.get("breed"),
      gender: formData.get("gender"),
      age_months: ageRaw ? parseInt(ageRaw as string, 10) : null,
      milk_yield_liters_per_day: milkRaw ? parseFloat(milkRaw as string) : null,
      price_inr: parseInt(formData.get("price_inr") as string, 10) || 0,
      description: formData.get("description"),
      district: formData.get("district"),
      state: formData.get("state"),
      status: chosenStatus,
    };

    const res = await updateListingAction(listing.id, payload, imagePaths);

    if (!res.success) {
      setError(res.error || "Failed to update listing.");
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      setIsSubmitting(false);
    } else {
      setSuccessMessage("Listing updated successfully!");
      setIsSubmitting(false);
      router.push(`/listings/${listing.id}`);
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await processForm(e.currentTarget);
  };

  return (
    <Card className="border-neutral-200 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-2xl">✏️</span>
          <div>
            <CardTitle className="text-2xl font-bold text-neutral-900">
              Edit Cattle Listing
            </CardTitle>
            <CardDescription className="text-sm text-neutral-500">
              Update listing details, pricing, photos, or status
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200"
            >
              {successMessage}
            </div>
          )}

          {/* Photos Dropzone */}
          <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
            <ImageDropzone
              userId={userId}
              listingId={listing.id}
              initialImages={initialImages}
              onImagesChange={(paths) => setImagePaths(paths)}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="title"
              className="text-xs font-semibold text-neutral-700"
            >
              Listing Title (10–140 characters)
            </label>
            <Input
              id="title"
              name="title"
              defaultValue={listing.title}
              placeholder="e.g. High-Yielding 2nd Lactation Murrah Buffalo with Calf"
              required
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-600">{fieldErrors.title[0]}</p>
            )}
          </div>

          {/* Category, Breed, Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="animal_type"
                className="text-xs font-semibold text-neutral-700"
              >
                Animal Category
              </label>
              <select
                id="animal_type"
                name="animal_type"
                defaultValue={listing.animal_type}
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <option value="cow">Cow</option>
                <option value="buffalo">Buffalo</option>
                <option value="bull">Bull</option>
                <option value="calf">Calf</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="breed"
                className="text-xs font-semibold text-neutral-700"
              >
                Breed
              </label>
              <Input
                id="breed"
                name="breed"
                defaultValue={listing.breed}
                placeholder="e.g. Sahiwal, Gir, Murrah"
                required
              />
              {fieldErrors.breed && (
                <p className="text-xs text-red-600">{fieldErrors.breed[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="gender"
                className="text-xs font-semibold text-neutral-700"
              >
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                defaultValue={listing.gender}
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>

          {/* Age, Milk Yield, Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="age_months"
                className="text-xs font-semibold text-neutral-700"
              >
                Age (in months)
              </label>
              <Input
                id="age_months"
                name="age_months"
                type="number"
                min="0"
                max="360"
                defaultValue={listing.age_months ?? ""}
                placeholder="e.g. 36 (3 years)"
              />
              {fieldErrors.age_months && (
                <p className="text-xs text-red-600">
                  {fieldErrors.age_months[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="milk_yield_liters_per_day"
                className="text-xs font-semibold text-neutral-700"
              >
                Daily Milk Yield (L/day)
              </label>
              <Input
                id="milk_yield_liters_per_day"
                name="milk_yield_liters_per_day"
                type="number"
                step="0.5"
                min="0"
                max="100"
                defaultValue={listing.milk_yield_liters_per_day ?? ""}
                placeholder="e.g. 14.5"
              />
              {fieldErrors.milk_yield_liters_per_day && (
                <p className="text-xs text-red-600">
                  {fieldErrors.milk_yield_liters_per_day[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="price_inr"
                className="text-xs font-semibold text-neutral-700"
              >
                Price (₹ Whole Rupees)
              </label>
              <Input
                id="price_inr"
                name="price_inr"
                type="number"
                min="1"
                max="100000000"
                defaultValue={listing.price_inr}
                placeholder="e.g. 75000"
                required
              />
              {fieldErrors.price_inr && (
                <p className="text-xs text-red-600">
                  {fieldErrors.price_inr[0]}
                </p>
              )}
            </div>
          </div>

          {/* Location: State & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="state"
                className="text-xs font-semibold text-neutral-700"
              >
                State
              </label>
              <Input
                id="state"
                name="state"
                defaultValue={listing.state}
                placeholder="e.g. Haryana"
                required
              />
              {fieldErrors.state && (
                <p className="text-xs text-red-600">{fieldErrors.state[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="district"
                className="text-xs font-semibold text-neutral-700"
              >
                District
              </label>
              <Input
                id="district"
                name="district"
                defaultValue={listing.district}
                placeholder="e.g. Karnal"
                required
              />
              {fieldErrors.district && (
                <p className="text-xs text-red-600">
                  {fieldErrors.district[0]}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="text-xs font-semibold text-neutral-700"
            >
              Detailed Description (20–3000 characters)
            </label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={listing.description}
              placeholder="Describe animal lactation cycle, vaccination history, temperament, diet, and physical health..."
              required
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600">
                {fieldErrors.description[0]}
              </p>
            )}
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="status"
              className="text-xs font-semibold text-neutral-700"
            >
              Listing Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={listing.status}
              className="flex h-10 w-full sm:w-64 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <option value="published">Published (Visible on marketplace)</option>
              <option value="draft">Draft (Hidden from buyers)</option>
              <option value="sold">Sold (Marked as sold)</option>
              {listing.status === "archived" && (
                <option value="archived">Archived</option>
              )}
            </select>
          </div>

          {/* Form Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="submit"
              className="w-full sm:flex-1 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving Changes..." : "Save Changes"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              onClick={(e) => {
                const form = (e.target as HTMLElement).closest("form");
                if (form) processForm(form, "draft");
              }}
            >
              Save as Draft
            </Button>

            <Link href={`/listings/${listing.id}`} className="w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto text-neutral-600 hover:text-neutral-900"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Link>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

