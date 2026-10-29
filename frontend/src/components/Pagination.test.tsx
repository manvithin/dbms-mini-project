import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

const pagination = {
  page: 1,
  per_page: 5,
  total: 12,
  pages: 3,
  has_next: true,
  has_prev: false,
};

describe("Pagination", () => {
  it("shows the visible range and moves to the next page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination pagination={pagination} onPageChange={onPageChange} label="visits" />);

    expect(screen.getByText(/showing/i)).toHaveTextContent("Showing 1 to 5 of 12 visits");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("does not render when there are no records", () => {
    const { container } = render(
      <Pagination
        pagination={{ ...pagination, total: 0, pages: 0, has_next: false }}
        onPageChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
