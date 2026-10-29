import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, LogOut, Menu, X } from "lucide-react";
import { useAuth, roleHome } from "../auth/AuthContext";
import { Avatar } from "../components/Avatar";
import { BackButton } from "../components/BackButton";
import { Button, LinkButton } from "../components/Button";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { Logo } from "../components/Logo";

export function PublicLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const showBack = !["/", "/login", "/register"].includes(location.pathname) && !location.pathname.startsWith("/doctors/");

  function closeMenu() {
    setOpen(false);
  }

  async function handleLogout() {
    await logout();
    closeMenu();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
        <div className="content-width flex h-[4.5rem] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink lg:hidden"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-controls="public-mobile-menu"
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            >
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            <Logo />
          </div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? "text-brand-800" : "text-muted hover:bg-brand-50 hover:text-ink"}`
              }
            >
              Find a doctor
            </NavLink>
            <a href="/#departments" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-brand-50 hover:text-ink">
              Departments
            </a>
            <a href="/#how-it-works" className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-brand-50 hover:text-ink">
              How it works
            </a>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <Link to={roleHome(user.role)} className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink transition hover:bg-brand-50">
                  {user.role === "doctor" ? <DoctorAvatar name={user.name} size="sm" /> : <Avatar name={user.name} size="sm" />}
                  <span className="max-w-[10rem] truncate">{user.name}</span>
                </Link>
                <Button variant="secondary" size="sm" onClick={handleLogout} icon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <LinkButton to={`/login?next=${encodeURIComponent(location.pathname)}`} variant="ghost" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton to="/register" size="sm" icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                  Create patient account
                </LinkButton>
              </>
            )}
          </div>
        </div>
        {open ? (
          <div id="public-mobile-menu" className="border-t border-line bg-white px-4 pb-5 pt-3 lg:hidden animate-fade-in">
            <nav className="space-y-1" aria-label="Mobile navigation">
              <Link to="/" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50">
                Find a doctor
              </Link>
              <a href="/#departments" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50">
                Departments
              </a>
              <a href="/#how-it-works" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50">
                How it works
              </a>
            </nav>
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              {user ? (
                <>
                  <LinkButton to={roleHome(user.role)} className="w-full" onClick={closeMenu}>
                    Go to dashboard
                  </LinkButton>
                  <Button variant="secondary" className="w-full" onClick={handleLogout}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <LinkButton to="/login" variant="secondary" className="w-full" onClick={closeMenu}>
                    Sign in
                  </LinkButton>
                  <LinkButton to="/register" className="w-full" onClick={closeMenu}>
                    Create patient account
                  </LinkButton>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>
      <main>
        {showBack ? (
          <div className="content-width pt-4">
            <BackButton fallbackTo="/" />
          </div>
        ) : null}
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="content-width grid gap-8 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
              Calm, connected outpatient care for the whole family. This teaching project uses synthetic records only.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">General Hospital, Bengaluru</p>
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Outpatient services</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>General Medicine</li>
              <li>Cardiology</li>
              <li>Paediatrics</li>
              <li>Orthopaedics</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Hospital hours</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>Monday to Saturday</li>
              <li>8:00 AM to 6:00 PM</li>
              <li>Sunday: emergency care only</li>
              <li>Reception: +91 80 4000 1200</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="content-width flex flex-col justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
            <p>General Hospital outpatient management system</p>
            <p>Synthetic demonstration data | Educational project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
