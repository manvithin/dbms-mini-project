import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { makeAppointment } from "../test/fixtures";
import { ClinicalRecord } from "./ClinicalRecord";

describe("ClinicalRecord", () => {
  it("shows an empty state when no clinical work exists", () => {
    const appointment = makeAppointment({
      tests: [],
      diagnosis: null,
      test_count: 0,
      has_diagnosis: false,
      has_prescription: false,
    });
    render(
      <MemoryRouter>
        <ClinicalRecord appointment={appointment} />
      </MemoryRouter>,
    );

    expect(screen.getByText("No clinical record yet")).toBeInTheDocument();
  });

  it("shows tests, diagnosis, prescription, and the print link", () => {
    render(
      <MemoryRouter>
        <ClinicalRecord appointment={makeAppointment()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Diagnostic tests")).toBeInTheDocument();
    expect(screen.getByText("Chest X ray")).toBeInTheDocument();
    expect(screen.getByText("No focal consolidation seen in either lung field.")).toBeInTheDocument();
    expect(screen.getByText("Acute bronchitis.")).toBeInTheDocument();
    expect(screen.getByText("Treatment plan and prescription")).toBeInTheDocument();
    expect(screen.getByText("Follow up on 05 Nov 2026")).toBeInTheDocument();

    const printLink = screen.getByRole("link", { name: "Print record" });
    expect(printLink).toHaveAttribute("href", "/print/appointments/101/record");
  });

  it("hides the print action in compact mode", () => {
    render(
      <MemoryRouter>
        <ClinicalRecord appointment={makeAppointment()} compact />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "Print record" })).not.toBeInTheDocument();
  });
});
