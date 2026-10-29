import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth, roleHome } from "../auth/AuthContext";
import { Avatar } from "../components/Avatar";
import { Button, LinkButton } from "../components/Button";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { Logo } from "../components/Logo";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navigation: Record<string, NavItem[]> = {
  patient: [
    { to: "/patient", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/patient/book", label: "Book appointment", icon: CalendarCheck2 },
    { to: "/patient/appointments", label: "My appointments", icon: CalendarDays },
    { to: "/patient/records", label: "My records", icon: FileText },
    { to: "/patient/profile", label: "Profile", icon: UserRound },
  ],
  doctor: [
    { to: "/doctor", label: "Today at a glance", icon: LayoutDashboard, end: true },
    { to: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/admin/departments", label: "Departments", icon: HeartPulse },
    { to: "/admin/schedules", label: "Schedules", icon: Clock3 },
    { to: "/admin/time-off", label: "Time off", icon: CalendarDays },
    { to: "/admin/appointments", label: "Appointments", icon: ClipboardList },
  ],
};

const roleLabels = {
  patient: "Patient portal",
  doctor: "Doctor workspace",
  admin: "Administration",
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;
  const userRole = user.role;
  const items = navigation[userRole] ?? [];
  const roleBadge =
    userRole === "admin"
      ? "bg-violet-50 text-violet-800"
      : userRole === "doctor"
        ? "bg-sky-50 text-sky-800"
        : "bg-brand-50 text-brand-800";

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    navigate("/login");
  }

  function renderNavigation() {
    return (
      <nav className="space-y-1" aria-label={`${roleLabels[userRole]} navigation`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-brand-700 text-white shadow-soft"
                    : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
                }`
              }
            >
              <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className={`mt-7 flex items-center gap-2 rounded-xl px-3 py-2 ${roleBadge}`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">
            {user.role === "admin" ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : user.role === "doctor" ? <Stethoscope className="h-4 w-4" aria-hidden="true" /> : <HeartPulse className="h-4 w-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{roleLabels[user.role]}</p>
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          </div>
        </div>
        <div className="mt-6 flex-1">{renderNavigation()}</div>
        <div className="space-y-3 border-t border-line pt-4">
          {user.role === "patient" ? (
            <LinkButton to="/patient/book" size="sm" className="w-full" icon={<CalendarCheck2 className="h-4 w-4" aria-hidden="true" />}>
              New appointment
            </LinkButton>
          ) : null}
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            {user.role === "doctor" ? <DoctorAvatar name={user.name} size="sm" /> : <Avatar name={user.name} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs capitalize text-muted">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-muted transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="app-mobile-menu"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{roleLabels[user.role]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={roleHome(user.role)}
              className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-200 sm:inline-flex"
            >
              <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
              {new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(new Date())}
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-line px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
            <p>General Hospital outpatient management system</p>
            <p>Synthetic demonstration data</p>
          </div>
        </footer>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
            tabIndex={-1}
          />
          <div
            id="app-mobile-menu"
            className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-line bg-white p-5 shadow-lift animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <Logo compact />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
              {user.role === "doctor" ? <DoctorAvatar name={user.name} /> : <Avatar name={user.name} />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-xs capitalize text-muted">{roleLabels[user.role]}</p>
              </div>
            </div>
            <div className="mt-5 flex-1">{renderNavigation()}</div>
            <div className="space-y-2 border-t border-line pt-4">
              {user.role === "patient" ? (
                <LinkButton to="/patient/book" className="w-full" size="sm" onClick={() => setMenuOpen(false)}>
                  New appointment
                </LinkButton>
              ) : null}
              <Button variant="secondary" className="w-full" onClick={handleLogout} icon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
                Sign out
              </Button>
              <p className="pt-1 text-center text-[11px] text-muted">General Hospital | Outpatient care</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
