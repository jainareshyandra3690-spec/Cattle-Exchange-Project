"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { signUpAction } from "@/actions/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await signUpAction(formData);

    if (!res.success) {
      setError(res.error || "Registration failed. Please check the information provided.");
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 bg-neutral-50/50">
      <Card className="w-full max-w-lg shadow-md border-neutral-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            🌾
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-neutral-900">
            Create Cattle Exchange Account
          </CardTitle>
          <CardDescription className="text-sm text-neutral-500">
            Connect directly with cattle buyers and sellers across India
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Full Name
                </label>
                <Input
                  name="full_name"
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
                {fieldErrors.full_name && (
                  <p className="text-xs text-red-600">{fieldErrors.full_name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Contact Mobile Number
                </label>
                <Input
                  name="phone"
                  placeholder="e.g. 9876543210"
                  required
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-red-600">{fieldErrors.phone[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  State
                </label>
                <Input
                  name="state"
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
                  placeholder="e.g. Karnal"
                  required
                />
                {fieldErrors.district && (
                  <p className="text-xs text-red-600">{fieldErrors.district[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="farmer@example.com"
                required
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">
                Password (min 6 characters)
              </label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600">{fieldErrors.password[0]}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Registering Account..." : "Create Account"}
            </Button>
            <p className="text-center text-xs text-neutral-600">
              Already registered?{" "}
              <Link href="/auth/sign-in" className="font-semibold text-emerald-700 hover:underline">
                Sign in to your account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

