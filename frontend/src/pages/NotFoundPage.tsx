import { Compass, Home, LayoutDashboard } from "lucide-react";
import { useAuth, roleHome } from "../auth/AuthContext";
import { LinkButton } from "../components/Button";

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="content-width flex min-h-[70vh] items-center justify-center py-16">
      <div className="max-w-xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Compass className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Page not found</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
          This page has moved or does not exist
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
          Check the address or return to a familiar part of the outpatient system.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <LinkButton to="/" variant="secondary" icon={<Home className="h-4 w-4" aria-hidden="true" />}>
            Go to the public site
          </LinkButton>
          {user ? (
            <LinkButton to={roleHome(user.role)} icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}>
              Go to my dashboard
            </LinkButton>
          ) : (
            <LinkButton to="/login" icon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}>
              Sign in
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
