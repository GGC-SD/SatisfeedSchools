// Test for user story LEC-30:
// As a user, I want to be able to access the dashboard-insights route with a link/button

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { fireEvent } from "@testing-library/react";

// Mock pathname so SidebarNav assumes we are on "/"
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

// Mock Next.js Link to behave like a normal <a> tag
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock only Offcanvas from react-bootstrap
vi.mock("react-bootstrap", async () => {
  const actual = await vi.importActual<any>("react-bootstrap");

  const MockOffcanvas: any = ({ children }: any) => (
    <div data-testid="offcanvas">{children}</div>
  );
  MockOffcanvas.Header = ({ children }: any) => <div>{children}</div>;
  MockOffcanvas.Title = ({ children }: any) => <div>{children}</div>;
  MockOffcanvas.Body = ({ children }: any) => <div>{children}</div>;

  return { ...actual, Offcanvas: MockOffcanvas };
});

import SidebarNav from "../../../src/components/ui/sidebar";

describe("User Story LEC-31: Access dashboard-schools route", () => {
  // This test verifies that the sidebar renders the correct link
  it("renders a link to /dashboard-insights (desktop nav)", () => {
    render(<SidebarNav />);

    // Locate the desktop navigation element
    const nav = screen.getByRole("navigation");

    // Search within nav for the Dashboard Insights link
    const link = within(nav).getByRole("link", { name: /dashboard insights/i });

    // Assert link existence and correct URL
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard-insights");
  });

  // This test simulates the user clicking the link
  it("allows user to click the link (simulates click)", () => {
    render(<SidebarNav />);

    // Locate the desktop navigation element
    const nav = screen.getByRole("navigation");

    // Get the Dashboard Insights link
    const link = within(nav).getByRole("link", { name: /dashboard insights/i });

    // Simulate user click
    fireEvent.click(link);

    // confirm the link is still valid
    expect(link).toHaveAttribute("href", "/dashboard-insights");
  });
});
