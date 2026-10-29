import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { roleHome, useAuth } from "../auth/AuthContext";

export function BackButton({
  to,
  label = "Back",
  className = "",
  fallbackTo,
}: {
  to?: string;
  label?: string;
  className?: string;
  fallbackTo?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fallback = fallbackTo ?? (user ? roleHome(user.role) : "/");
  const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const canGoBack = historyIndex > 0;
  const classes = `no-print inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-muted transition hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  function handleClick() {
    if (canGoBack) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }

  return (
    <button type="button" onClick={handleClick} className={classes}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
