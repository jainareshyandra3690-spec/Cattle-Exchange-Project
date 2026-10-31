import { describe, it, expect } from "vitest";
import { formatINR, formatMilkYield, formatAge } from "@/lib/formatters";

describe("Domain Formatters", () => {
  describe("formatINR", () => {
    it("formats standard cattle prices using Indian numbering system", () => {
      expect(formatINR(85000)).toMatch(/₹\s*85,000/);
      expect(formatINR(125000)).toMatch(/₹\s*1,25,000/);
      expect(formatINR(1250000)).toMatch(/₹\s*12,50,000/);
    });

    it("handles zero gracefully", () => {
      expect(formatINR(0)).toMatch(/₹\s*0/);
    });

    it("handles invalid or negative input cleanly without throwing", () => {
      expect(formatINR(-500)).toMatch(/₹\s*0/);
      expect(formatINR(NaN)).toMatch(/₹\s*0/);
    });

    it("discards fractional currency (paise) and truncates to whole rupees", () => {
      expect(formatINR(75000.75)).toMatch(/₹\s*75,000/);
    });
  });

  describe("formatMilkYield", () => {
    it("formats valid milk yields with units", () => {
      expect(formatMilkYield(16.5)).toBe("16.5 L/day");
      expect(formatMilkYield(12)).toBe("12 L/day");
    });

    it("returns null for non-applicable cases (null, undefined, zero)", () => {
      expect(formatMilkYield(null)).toBeNull();
      expect(formatMilkYield(undefined)).toBeNull();
      expect(formatMilkYield(0)).toBeNull();
      expect(formatMilkYield(-2)).toBeNull();
    });
  });

  describe("formatAge", () => {
    it("formats age in months when less than one year", () => {
      expect(formatAge(8)).toBe("8 mos");
    });

    it("formats exact years cleanly", () => {
      expect(formatAge(12)).toBe("1 yr");
      expect(formatAge(24)).toBe("2 yrs");
      expect(formatAge(36)).toBe("3 yrs");
    });

    it("formats mixed years and months", () => {
      expect(formatAge(38)).toBe("3 yr 2 mo");
      expect(formatAge(15)).toBe("1 yr 3 mo");
    });

    it("returns 'Age: Not specified' for null or undefined values", () => {
      expect(formatAge(null)).toBe("Age: Not specified");
      expect(formatAge(undefined)).toBe("Age: Not specified");
      expect(formatAge(-5)).toBe("Age: Not specified");
    });
  });
});

