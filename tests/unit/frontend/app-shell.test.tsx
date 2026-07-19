import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/frontend/layout/AppShell";

describe("AppShell", () => {
  it("renders product title and children", () => {
    render(
      <AppShell>
        <p>Child content</p>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Hagal");
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });
});
