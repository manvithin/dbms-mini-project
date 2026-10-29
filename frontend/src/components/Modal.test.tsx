import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./Modal";

describe("ConfirmDialog", () => {
  it("renders an accessible dialog and confirms the action", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Cancel this appointment?"
        description="The appointment will be released for other patients."
        confirmLabel="Cancel appointment"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Cancel this appointment?" });
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel appointment" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("closes with the cancel button and the Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Cancel this appointment?"
        description="The appointment will be released for other patients."
      />,
    );

    await user.click(screen.getByRole("button", { name: "Keep as is" }));
    expect(onClose).toHaveBeenCalledOnce();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Cancel this appointment?"
        description="The appointment will be released for other patients."
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
