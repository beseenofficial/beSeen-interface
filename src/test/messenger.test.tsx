import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

import MessengerPage from "@/app/(dashboard)/dashboard/messenger/page";

describe("messenger route", () => {
  it("shows only the branded coming-soon experience", () => {
    render(<MessengerPage />);
    expect(screen.getByRole("heading", { name: "Messenger is coming soon" })).toBeInTheDocument();
    expect(screen.getByText("Private bounty messages and creator replies will live here.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
