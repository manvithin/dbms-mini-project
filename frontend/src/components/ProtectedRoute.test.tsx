import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../auth/AuthContext";
import type { Role, User } from "../types";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("../auth/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/AuthContext")>();
  return { ...actual, useAuth: vi.fn() };
});

const mockedUseAuth = vi.mocked(useAuth);

function userWithRole(role: Role): User {
  return {
    user_id: 1,
    email: `${role}@example.com`,
    role,
    is_active: true,
    created_at: "2026-10-01T09:00:00",
    patient_id: role === "patient" ? 1 : null,
    doctor_id: role === "doctor" ? 1 : null,
    name: "Demo User",
  };
}

function renderRoute(roles: Role[]) {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute roles={roles}>
              <p>Protected content</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="/patient" element={<p>Patient workspace</p>} />
        <Route path="/doctor" element={<p>Doctor workspace</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it("shows a session check while authentication is loading", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    renderRoute(["patient"]);

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  });

  it("sends signed out visitors to login with a return path", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    renderRoute(["patient"]);

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("redirects a signed in user away from another role area", () => {
    mockedUseAuth.mockReturnValue({
      user: userWithRole("patient"),
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    renderRoute(["admin"]);

    expect(screen.getByText("Patient workspace")).toBeInTheDocument();
  });

  it("renders the protected content for an allowed role", () => {
    mockedUseAuth.mockReturnValue({
      user: userWithRole("patient"),
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });

    renderRoute(["patient"]);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
