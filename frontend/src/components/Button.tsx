import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white shadow-soft hover:bg-brand-800 focus-visible:ring-brand-300 disabled:bg-brand-700/50",
  secondary:
    "border border-line bg-white text-ink shadow-sm hover:border-brand-200 hover:bg-brand-50 focus-visible:ring-brand-200",
  ghost: "text-ink hover:bg-brand-50 focus-visible:ring-brand-200",
  danger:
    "bg-rose-600 text-white shadow-soft hover:bg-rose-700 focus-visible:ring-rose-300 disabled:bg-rose-600/50",
  subtle: "bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:ring-brand-200",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  onClick,
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}
