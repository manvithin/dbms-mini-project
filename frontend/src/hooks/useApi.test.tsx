import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";
import { useApi } from "./useApi";

function Harness({ path, enabled = true }: { path: string | null; enabled?: boolean }) {
  const state = useApi<{ value: string }>(path, { enabled });
  return (
    <div>
      <p>{state.loading ? "Loading data" : state.data ? `Loaded ${state.data.value}` : "No data"}</p>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="button" onClick={state.reload}>
        Reload data
      </button>
    </div>
  );
}

describe("useApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads data from the API", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ value: "record" });

    render(<Harness path="/records" />);

    expect(screen.getByText("Loading data")).toBeInTheDocument();
    expect(await screen.findByText("Loaded record")).toBeInTheDocument();
  });

  it("shows a safe error message when the request fails", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new ApiError("Server unavailable", 500));

    render(<Harness path="/records" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("does not request data when the path is missing or disabled", () => {
    const getSpy = vi.spyOn(api, "get");

    render(<Harness path={null} enabled={false} />);

    expect(getSpy).not.toHaveBeenCalled();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("reloads the request when asked", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ value: "first" })
      .mockResolvedValueOnce({ value: "second" });

    render(<Harness path="/records" />);

    expect(await screen.findByText("Loaded first")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reload data" }));

    await waitFor(() => expect(screen.getByText("Loaded second")).toBeInTheDocument());
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
