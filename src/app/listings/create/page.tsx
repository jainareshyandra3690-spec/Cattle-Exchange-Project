"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ImageDropzone } from "@/components/image-dropzone";
import { createListingAction } from "@/actions/listings";
import { getCurrentUserAction } from "@/actions/auth";

export default function CreateListingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{ state: string; district: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const authData = await getCurrentUserAction();
      if (!authData?.user) {
        router.push("/auth/sign-in?redirect=/listings/create");
        return;
      }
      setUser(authData.user);
      setProfile(authData.profile);
      setLoadingUser(false);
    }
    loadUser();
  }, [router]);

  const processForm = async (form: HTMLFormElement, publishStatus: "draft" | "published") => {
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(form);

    const ageRaw = formData.get("age_months");
    const milkRaw = formData.get("milk_yield_liters_per_day");

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
      status: publishStatus,
    };

    const res = await createListingAction(payload, imagePaths);

    if (!res.success) {
      setError(res.error || "Failed to create listing.");
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      setIsSubmitting(false);
    } else {
      router.push(publishStatus === "published" ? `/listings/${res.data?.listingId}` : "/dashboard");
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await processForm(e.currentTarget, "published");
  };

  if (loadingUser) {
    return (
      <div className="container mx-auto max-w-3xl py-12 px-4 text-center">
        <p className="text-neutral-500">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 sm:px-6">
      <Card className="border-neutral-200 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <div>
              <CardTitle className="text-2xl font-bold text-neutral-900">
                Post New Cattle Listing
              </CardTitle>
              <CardDescription className="text-sm text-neutral-500">
                Provide accurate details to reach genuine buyers across the marketplace
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Photos */}
            {user && (
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <ImageDropzone
                  userId={user.id}
                  onImagesChange={(paths) => setImagePaths(paths)}
                />
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Listing Title (10–140 characters)
              </label>
              <Input
                name="title"
                placeholder="e.g. High-Yielding 2nd Lactation Murrah Buffalo with Calf"
                required
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-600">{fieldErrors.title[0]}</p>
              )}
            </div>

            {/* Category & Breed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Animal Category
                </label>
                <select
                  name="animal_type"
                  defaultValue="cow"
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
                <label className="text-xs font-semibold text-neutral-700">
                  Breed
                </label>
                <Input
                  name="breed"
                  placeholder="e.g. Sahiwal, Gir, Murrah"
                  required
                />
                {fieldErrors.breed && (
                  <p className="text-xs text-red-600">{fieldErrors.breed[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Gender
                </label>
                <select
                  name="gender"
                  defaultValue="female"
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
                <label className="text-xs font-semibold text-neutral-700">
                  Age (in months)
                </label>
                <Input
                  name="age_months"
                  type="number"
                  min="0"
                  max="360"
                  placeholder="e.g. 36 (3 years)"
                />
                {fieldErrors.age_months && (
                  <p className="text-xs text-red-600">{fieldErrors.age_months[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Daily Milk Yield (L/day)
                </label>
                <Input
                  name="milk_yield_liters_per_day"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="e.g. 14.5"
                />
                {fieldErrors.milk_yield_liters_per_day && (
                  <p className="text-xs text-red-600">
                    {fieldErrors.milk_yield_liters_per_day[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Price (₹ Whole Rupees)
                </label>
                <Input
                  name="price_inr"
                  type="number"
                  min="1"
                  max="100000000"
                  placeholder="e.g. 75000"
                  required
                />
                {fieldErrors.price_inr && (
                  <p className="text-xs text-red-600">{fieldErrors.price_inr[0]}</p>
                )}
              </div>
            </div>

            {/* Location: State & District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  State
                </label>
                <Input
                  name="state"
                  defaultValue={profile?.state || ""}
                  placeholder="e.g. Haryana"
                  required
                />
                {fieldErrors.state && (
                  <p className="text-xs text-red-600">{fieldErrors.state[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  District
                </label>
                <Input
                  name="district"
                  defaultValue={profile?.district || ""}
                  placeholder="e.g. Karnal"
                  required
                />
                {fieldErrors.district && (
                  <p className="text-xs text-red-600">{fieldErrors.district[0]}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Detailed Description (20–3000 characters)
              </label>
              <Textarea
                name="description"
                rows={4}
                placeholder="Describe animal lactation cycle, vaccination history, temperament, diet, and physical health..."
                required
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600">{fieldErrors.description[0]}</p>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
              <Button
                type="submit"
                className="flex-1 font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Publishing..." : "Publish Listing"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={(e) => {
                  const form = (e.target as HTMLElement).closest("form");
                  if (form) processForm(form, "draft");
                }}
              >
                Save as Draft
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

