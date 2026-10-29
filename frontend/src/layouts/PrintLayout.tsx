import { Outlet } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useAuth, roleHome } from "../auth/AuthContext";
import { Button, LinkButton } from "../components/Button";
import { Logo } from "../components/Logo";

export function PrintLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800 sm:inline">
              Print preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LinkButton
              to={user ? roleHome(user.role) : "/"}
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Back to portal
            </LinkButton>
            <Button
              size="sm"
              onClick={() => window.print()}
              icon={<Printer className="h-4 w-4" aria-hidden="true" />}
            >
              Print or save as PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 print:max-w-none print:p-0">
        <div className="print-sheet mx-auto max-w-[210mm] rounded-xl2 border border-line bg-white p-6 shadow-soft sm:p-10">
          <Outlet />
        </div>
        <p className="no-print mt-4 text-center text-xs leading-5 text-muted">
          Choose Print in the toolbar to print this page or save it as a PDF. Navigation and action controls are hidden in the printed copy.
        </p>
      </div>
    </div>
  );
}
