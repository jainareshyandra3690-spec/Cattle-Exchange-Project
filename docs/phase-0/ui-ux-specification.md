# Cattle Exchange — UI/UX Design & Component Specification

**Document Version:** 1.1.0  
**Phase:** Phase 0 (Architecture, Requirements, and Planning — Review Revisions)  
**Status:** Ready for Review & Approval  
**Last Updated:** October 2026  

---

## 1. Visual Identity & Design Tokens

Cattle Exchange embraces an **agricultural-first, warm, grounded, and highly legible** visual language. The design avoids cold corporate aesthetics or generic neon gradients, instead drawing inspiration from fertile soil, lush pastures, and traditional Indian rural textures.

### 1.1 Color Palette & Theme Tokens

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DESIGN TOKEN PALETTE                            │
└────────────────────────────────────────────────────────────────────────┘

  [ Primary Forest ]       [ Muted Olive ]         [ Earthy Terracotta ]
     #1B4332                   #606C38                   #BC6C25
  (Buttons, Headers)       (Badges, Accents)        (Highlights, Warm CTA)

  [ Warm Cream Bg ]        [ Surface Off-White ]   [ Charcoal Typography ]
     #FDFBF7                   #F8F5EE                   #1F2421
  (Page Background)        (Card Containers)        (Primary Readable Text)
```

| Token Name | Hex Code | HSL / CSS Variable | Usage & Application |
| :--- | :--- | :--- | :--- |
| **Background (Page)** | `#FDFBF7` | `hsl(40, 33%, 98%)` | Main application background; eliminates harsh white glare in bright sunlight. |
| **Surface (Card/Box)** | `#F8F5EE` | `hsl(43, 35%, 95%)` | Card backgrounds, search panels, and grouped container sections. |
| **Surface Elevated** | `#FFFFFF` | `hsl(0, 0%, 100%)` | Modals, dropdown menus, and active form input fields. |
| **Border / Divider** | `#E6E2D8` | `hsl(43, 18%, 87%)` | Subtle borders, table separators, and input boundaries. |
| **Primary (Forest Green)**| `#1B4332` | `hsl(153, 42%, 18%)` | Primary brand color: buttons, header branding, active navigation links. |
| **Primary Hover** | `#2D6A4F` | `hsl(153, 40%, 30%)` | Interactive hover and focus states for primary elements. |
| **Secondary (Muted Olive)**| `#606C38` | `hsl(73, 31%, 32%)` | Breed badges, verified indicators, and secondary tags. |
| **Accent (Earthy Terracotta)**| `#BC6C25` | `hsl(30, 65%, 44%)` | Attention-grabbing badges ("SOLD", "Top Yield"), secondary CTAs. |
| **Accent Light (Warm Sand)**| `#DDA15E` | `hsl(34, 65%, 62%)` | Soft banner highlights, rating stars, and subtle icon tints. |
| **Text Primary (Charcoal)**| `#1F2421` | `hsl(144, 6%, 13%)` | Headlines, body copy, and listing titles for maximum contrast. |
| **Text Muted (Slate)** | `#495057` | `hsl(210, 9%, 31%)` | Subtitles, metadata labels, and timestamps. |
| **Semantic Success** | `#2D6A4F` | `hsl(153, 40%, 30%)` | Success alerts, "Published" status badges. |
| **Semantic Warning** | `#D4A373` | `hsl(30, 52%, 64%)` | Draft warnings, missing photo notices. |
| **Semantic Destructive** | `#9B2226` | `hsl(358, 64%, 38%)` | Delete actions, archive alerts, form error text. |

---

### 1.2 Typography & Formatting

- **Font Family:** `Inter`, `Plus Jakarta Sans`, or system native sans-serif stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Hierarchy Scale:**
  - `Display / H1`: 2rem – 2.5rem (32px – 40px), Bold (700), Charcoal.
  - `H2 (Section Header)`: 1.5rem – 1.75rem (24px – 28px), SemiBold (600).
  - `H3 (Card Title)`: 1.125rem – 1.25rem (18px – 20px), SemiBold (600).
  - `Body Regular`: 1rem (16px), Regular (400), Line Height 1.6.
  - `Metadata / Caption`: 0.875rem (14px), Medium (500), Slate Muted.
- **Indian Currency Representation:**
  - All prices formatted using Indian numbering system separators:  
    `₹1,25,000` (One Lakh Twenty-Five Thousand), `₹45,000` (Forty-Five Thousand), `₹12,50,000` (Twelve Lakhs Fifty Thousand).
  - Utility helper: `formatINR(price: number): string => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);`

---

## 2. Page Inventory & Routing Structure

```
app/
├── (public)/
│   ├── page.tsx                     <-- / (Homepage & Category Showcase)
│   ├── browse/
│   │   └── page.tsx                 <-- /browse (Marketplace Catalog & Search)
│   ├── listings/
│   │   └── [id]/
│   │       └── page.tsx             <-- /listings/[id] (Listing Detail & Photos)
│   ├── about/page.tsx               <-- /about
│   ├── privacy/page.tsx             <-- /privacy (Privacy Policy & Contact Disclosure)
│   └── terms/page.tsx               <-- /terms
├── (auth)/
│   ├── login/page.tsx               <-- /login
│   ├── register/page.tsx            <-- /register
│   └── forgot-password/page.tsx     <-- /forgot-password
├── (protected)/
│   ├── dashboard/
│   │   ├── page.tsx                 <-- /dashboard (Seller Overview)
│   │   └── listings/
│   │       ├── page.tsx             <-- /dashboard/listings (Manage Listings)
│   │       ├── new/page.tsx         <-- /dashboard/listings/new (Create Listing)
│   │       └── [id]/
│   │           └── edit/page.tsx    <-- /dashboard/listings/[id]/edit (Edit Listing)
│   └── profile/
│       └── page.tsx                 <-- /profile (Profile & Phone Privacy Settings)
└── (admin)/
    └── admin/
        ├── page.tsx                 <-- /admin (Moderation Dashboard)
        └── listings/page.tsx        <-- /admin/listings (Listing Review & Archiving)
```

---

## 3. Core Component Specifications

### 3.1 ListingCard Component
The primary browsing tile displayed in grids and lists.

```
┌──────────────────────────────────────────────┐
│ [Photo 4:3 Aspect Ratio - Cover (Sort 0)]   │
│ [Type: Cow]               [Status: Published]│
├──────────────────────────────────────────────┤
│ High-Yielding 2nd Lactation Murrah Buffalo   │
│ Breed: Murrah  •  Age: 38 mos                │
│                                              │
│ 🥛 16.5 L/day              📍 Karnal, Haryana│
│                                              │
│ ₹ 85,000                        [View Details│
└──────────────────────────────────────────────┘
```

- **Visual Elements & Null Field Handling:**
  - Responsive image thumbnail with 4:3 aspect ratio, rounded top borders, displaying the cover image (`sort_order = 0`). Fallback placeholder graphic rendered if no photo exists.
  - Overlay badges: Top-left `animal_type` badge (e.g., "Cow", "Buffalo"); Top-right status badge (if seller is viewing).
  - Headline: 2-line clamped title, font SemiBold 18px.
  - Metrics Row:
    - **Milk Yield:** If `milk_yield_liters_per_day` is non-null and animal is female, renders `🥛 16.5 L/day`. If null or animal is male (`bull`) or calf, the milk yield badge is **completely hidden** (never rendered as `0 L/day` or `null`).
    - **Age:** If `age_months` is non-null, renders `38 mos`. If null, renders `"Age: Not specified"`.
  - Location Row: Map pin icon with `District, State` string.
  - Price: Bold Forest Green display in whole rupees (`₹85,000`).

---

### 3.2 FilterSidebar & Mobile FilterSheet
- **Desktop Layout:** Fixed-width 280px left sidebar with sticky scrolling.
- **Mobile Layout:** Bottom drawer (`Sheet` component from shadcn/ui) triggered by a floating or top-bar "Filters (X)" button.
- **Faceted Controls:**
  1. *Animal Type:* Pill-shaped multi-select buttons (`All`, `Cow`, `Buffalo`, `Bull`, `Calf`, `Other`).
  2. *Breed:* Text search input with auto-suggestions of prominent Indian breeds (Gir, Sahiwal, Murrah, Jaffarabadi, Tharparkar, Red Sindhi, HF Cross, Jersey Cross).
  3. *Location:* Dual dropdown selectors for Indian State and District.
  4. *Price Range:* Dual slider or Min/Max numeric inputs (in ₹ thousands). Enforces min $\ge 1$.
  5. *Milk Yield Minimum:* Slider control (0 to 40+ Liters/day), conditionally disabled if user selects "Bull" or "Calf".
  6. *Action Buttons:* "Apply Filters" and "Reset All".

---

### 3.3 ImageGallery Component
Displayed on `/listings/[id]`. Supports up to 5 photos (`sort_order` values 0 through 4).
- **Primary Stage:** Large container with 4:3 ratio; pinch-to-zoom on mobile and click-to-expand lightbox modal on desktop.
- **Thumbnail Rail:** Horizontal strip of up to 5 thumbnail previews below the main stage. Clicking or tapping a thumbnail smoothly swaps the active view.
- **Touch Gestures:** Native touch-swipe between photos on mobile devices.
- **Accessibility:** Full keyboard arrow navigation (`Left`, `Right`) and ARIA live region announcing `"Photo X of Y"`.

---

### 3.4 SellerContactCard Component
Displayed on `/listings/[id]` sidebar / bottom bar. Backed by the secure `public_profiles` view:

- **State 1: Public Contact (`phone_public: true`):**
  - Displays seller name (`Ramesh Kumar`), location (`Karnal, Haryana`), and member tenure (`Member since Mar 2026`).
  - Primary Action 1: "Call Seller" button (`tel:+91XXXXXXXXXX`) in Forest Green.
  - Primary Action 2: "WhatsApp" button (`https://wa.me/91XXXXXXXXXX?...`) with official green accent and pre-filled inquiry text.
- **State 2: Protected Contact (`phone_public: false`):**
  - Displays seller name and location.
  - Contact box displays: *"The seller has chosen to keep their phone number private."*
  - The phone number is omitted from rendered HTML and API payloads.

---

### 3.5 ListingForm Component (Create & Edit)
Multi-section progressive form built with React Hook Form and Zod:
1. **Section 1: Basic Classification:** Animal Type selection (triggers dynamic conditional inputs), Breed, Gender.
2. **Section 2: Physical & Productivity Specs:**
   - Age in months (optional, 0–360).
   - Daily Milk Yield in Liters: Conditionally disabled and cleared when Gender is Male or Animal Type is Bull/Calf.
3. **Section 3: Pricing & Location:**
   - Price in INR: Strictly positive integer (`> 0`). Real-time Indian word preview (e.g. typing `75000` displays *"Seventy-Five Thousand Rupees"*). Rejects negative or zero values.
   - State and District dropdowns.
4. **Section 4: Photographs:**
   - Multi-image upload dropzone supporting **1 to 5 photos** maximum.
   - Sort order re-indexing (`sort_order` 0 to 4).
   - Pre-upload canvas compression/resizing to save bandwidth on rural networks.
5. **Section 5: Description & Notes:** Multi-line textarea (20–3000 chars) for vaccination status, lactation cycle, feeding habits.

---

## 4. Responsive Layouts & Breakpoints

- **Mobile (`< 640px`):** Single-column layout. Sticky bottom navigation bar on mobile for quick access to Browse, Sell (+), and Dashboard. Sticky contact action bar on listing detail page.
- **Tablet (`640px – 1024px`):** 2-column grid for listing cards. Collapsible filter drawer.
- **Desktop (`> 1024px`):** 3-column or 4-column listing grid. 280px sticky filter sidebar. Two-column detail page (60% gallery + specs, 40% seller info + contact card).

---

## 5. Micro-Interactions, States & Accessibility

### 5.1 System States
- **Loading State:** Skeleton loaders (`Skeleton` component) matching the exact dimensions of listing cards and gallery blocks, preventing layout shift (Cumulative Layout Shift < 0.05).
- **Empty State:** Illustrated empty card with clear messaging (e.g. *"No buffaloes found in Karnal under ₹70,000. Try widening your price filter or clearing district filters."*) and a prominent "Reset Filters" button.
- **Error State:** In-line form validation warnings in Destructive Red (`#9B2226`); global error boundaries displaying user-friendly recovery instructions.
- **Success State:** Toast alerts (using shadcn/ui `Sonner`) confirming listing publication, profile updates, and image uploads.

### 5.2 Accessibility (WCAG 2.1 AA Compliance)
- Contrast ratios verified $\ge 4.5:1$ against warm cream surfaces.
- Focus outlines: All interactive buttons and inputs feature visible `ring-2 ring-forest-500` keyboard focus rings.
- Motion Preferences: Animations wrapped in `@media (prefers-reduced-motion: reduce)` to disable transitions for sensitive users.

---

## 6. Approval Sign-off

| Role | Sign-off Name | Status | Date |
| :--- | :--- | :--- | :--- |
| **Technical Lead & Architect** | Antigravity Lead Architect | Completed (Review v1.1.0) | October 2026 |
| **Product & UI/UX Design** | Design System Review | Pending Approval | — |
