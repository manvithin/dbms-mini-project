import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("runs the click handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled while loading", () => {
    render(<Button loading>Saving changes</Button>);
    expect(screen.getByRole("button", { name: "Saving changes" })).toBeDisabled();
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Button disabled>Unavailable action</Button>);
    expect(screen.getByRole("button", { name: "Unavailable action" })).toBeDisabled();
  });
});
