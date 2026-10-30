import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, Modal } from "./Modal";

function TypingHarness() {
  const [summary, setSummary] = useState("");
  return (
    <Modal open onClose={() => undefined} title="Record test result">
      <label htmlFor="result-summary">Result summary</label>
      <textarea id="result-summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
    </Modal>
  );
}

describe("Modal dialogs", () => {
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

  it("keeps focus while a controlled field is edited", async () => {
    const user = userEvent.setup();
    render(<TypingHarness />);

    const field = screen.getByLabelText("Result summary");
    await user.click(field);
    await user.keyboard("Normal chest X ray");

    expect(field).toHaveValue("Normal chest X ray");
    expect(field).toHaveFocus();
  });
});
