import { render, screen } from "@testing-library/react";

import type { RecipeBlok } from "../../types/storyblok.gen";
import { RecipeCard } from "./RecipeCard";

// Spec 055 — the card is a link only where a caller opts in with `href`.

jest.mock("@storyblok/react/rsc", () => ({ storyblokEditable: () => ({}) }));
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
jest.mock("../../i18n/navigation", () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));
jest.mock("@sorrel/ui", () => ({
  appTokens: { radius: { surface: 16 } },
  AppCard: ({ children, interactive }: { children: React.ReactNode; interactive?: boolean }) => (
    <div data-interactive={String(Boolean(interactive))}>{children}</div>
  ),
  AppHeading: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AppText: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AppStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AppImage: () => null,
  AppChip: ({ label }: { label: string }) => <span>{label}</span>,
  AppLink: ({
    children,
    href,
    component: Component = "a",
  }: {
    children: React.ReactNode;
    href: string;
    component?: React.ElementType;
  }) => <Component href={href}>{children}</Component>,
}));

const blok = {
  _uid: "1",
  component: "recipe",
  name: "Wild-caught salmon",
  slug: "wild-caught-salmon",
  description: "Omega-rich salmon.",
  dietaryTags: [],
} as unknown as RecipeBlok;

describe("RecipeCard", () => {
  it("renders no link without href (wizard picker)", () => {
    render(<RecipeCard blok={blok} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("heading").textContent).toBe("Wild-caught salmon");
  });

  it("makes the recipe name the card link with href (landing showcase)", () => {
    render(<RecipeCard blok={blok} href="/recipes/wild-caught-salmon" />);
    const link = screen.getByRole("link", { name: "Wild-caught salmon" });
    expect(link.getAttribute("href")).toBe("/recipes/wild-caught-salmon");
    expect(link.closest("[data-interactive]")?.getAttribute("data-interactive")).toBe("true");
  });
});
