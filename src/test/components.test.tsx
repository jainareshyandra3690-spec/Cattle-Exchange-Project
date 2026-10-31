import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

describe("Design System UI Primitives", () => {
  describe("Button", () => {
    it("renders with default variant and responds to clicks", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole("button", { name: /click me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies secondary and accent variant classes", () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-olive");

      rerender(<Button variant="accent">Accent</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-terracotta");
    });

    it("respects disabled attribute", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );

      const btn = screen.getByRole("button", { name: /disabled button/i });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Badge", () => {
    it("renders animal categories and status variants correctly", () => {
      const { rerender } = render(<Badge variant="published">Published</Badge>);
      expect(screen.getByText("Published")).toBeInTheDocument();

      rerender(<Badge variant="sold">SOLD</Badge>);
      expect(screen.getByText("SOLD")).toHaveClass("bg-terracotta");
    });
  });

  describe("Card", () => {
    it("renders composite structure properly", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>Card Content Body</CardContent>
        </Card>
      );

      expect(screen.getByText("Card Title")).toBeInTheDocument();
      expect(screen.getByText("Card Content Body")).toBeInTheDocument();
    });
  });

  describe("Input", () => {
    it("renders input and handles error prop styling", () => {
      const { rerender } = render(<Input placeholder="Search breed" />);
      const input = screen.getByPlaceholderText("Search breed");
      expect(input).toBeInTheDocument();

      rerender(<Input placeholder="Search breed" error />);
      expect(input).toHaveClass("border-destructive");
    });
  });

  describe("Alert", () => {
    it("renders with role='alert' and semantic content", () => {
      render(
        <Alert variant="warning">
          <AlertTitle>Warning Title</AlertTitle>
          <AlertDescription>Warning description details</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("Warning Title")).toBeInTheDocument();
    });
  });

  describe("EmptyState", () => {
    it("renders empty state message and optional action", () => {
      render(
        <EmptyState
          title="No Results Found"
          description="Try broadening your search"
          action={<Button size="sm">Reset</Button>}
        />
      );

      expect(screen.getByText("No Results Found")).toBeInTheDocument();
      expect(screen.getByText("Try broadening your search")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });
  });
});

