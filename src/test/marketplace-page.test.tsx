import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketplaceContent } from "@/app/page";
import { Navbar } from "@/components/navbar";
import { NavbarFallback } from "@/components/navbar-server";
import { ListingCard } from "@/components/listing-card";
import type { CattleListing } from "@/types/database";

describe("Marketplace Homepage & Navigation", () => {
  it("renders the Navbar with branding and Sell Cattle action", () => {
    render(<Navbar user={null} profile={null} />);

    expect(screen.getByText("Cattle Exchange")).toBeInTheDocument();
    expect(screen.getByText(/Sell Cattle/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
  });

  it("renders the static NavbarFallback with branding and actions without authentication", () => {
    render(<NavbarFallback />);

    expect(screen.getByText("Cattle Exchange")).toBeInTheDocument();
    expect(screen.getByText(/Sell Cattle/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });

  it("renders Navbar authenticated state when user is signed in", () => {
    render(
      <Navbar
        user={{ id: "user-1", email: "farmer@test.com" }}
        profile={{ full_name: "Gurpreet Singh", role: "user" }}
      />
    );

    expect(screen.getByText("Gurpreet Singh")).toBeInTheDocument();
    expect(screen.getByText(/My Listings & Profile/i)).toBeInTheDocument();
  });

  it("renders the Marketplace HomePage with live search and livestock feed", async () => {
    const pageContent = await MarketplaceContent({ searchParams: Promise.resolve({}) });
    render(pageContent);

    // Hero title
    expect(
      screen.getByRole("heading", { level: 1, name: /Buy & Sell Cattle Across India/i })
    ).toBeInTheDocument();

    // Search input
    expect(
      screen.getByPlaceholderText(/search breed.*or location/i)
    ).toBeInTheDocument();

    // Categories
    expect(screen.getByText(/All Livestock/i)).toBeInTheDocument();
    expect(screen.getByText(/Cows/i)).toBeInTheDocument();
    expect(screen.getByText(/Buffaloes/i)).toBeInTheDocument();

    // Listings
    expect(screen.getByText(/Pure Sahiwal Cow/i)).toBeInTheDocument();
    expect(screen.getByText(/Elite Murrah Buffalo/i)).toBeInTheDocument();
  });

  it("renders ListingCard with formatted whole INR price and specs", () => {
    const sampleListing: CattleListing = {
      id: "sample-1",
      seller_id: "seller-1",
      title: "Pedigree Gir Cow in 2nd Lactation",
      animal_type: "cow",
      breed: "Gir",
      gender: "female",
      age_months: 36,
      milk_yield_liters_per_day: 14.5,
      price_inr: 75000,
      description: "High quality dairy animal with complete vaccination records.",
      district: "Anand",
      state: "Gujarat",
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: [],
    };

    render(<ListingCard listing={sampleListing} />);

    expect(screen.getByText("Pedigree Gir Cow in 2nd Lactation")).toBeInTheDocument();
    expect(screen.getByText("Gir")).toBeInTheDocument();
    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText(/14\.5 L\/day/)).toBeInTheDocument();
    expect(screen.getByText(/₹\s*75,000/)).toBeInTheDocument();
    expect(screen.getByText(/Anand, Gujarat/)).toBeInTheDocument();
  });
});

