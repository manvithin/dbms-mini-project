import { initials } from "../utils/format";

const tones = [
  "bg-brand-100 text-brand-800",
  "bg-amber-100 text-amber-900",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-emerald-100 text-emerald-800",
];

export function Avatar({
  name,
  size = "md",
  tone,
  src,
  shape = "circle",
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  tone?: number;
  src?: string;
  shape?: "circle" | "rounded";
}) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
    "2xl": "h-28 w-28 text-2xl",
  };
  const shapes = {
    circle: "rounded-full",
    rounded: "rounded-2xl",
  };
  const seed = name.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const selected = tones[tone ?? seed % tones.length];
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={`inline-block shrink-0 border-2 border-white bg-brand-50 object-cover shadow-soft ${shapes[shape]} ${sizes[size]}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold tracking-wide ${selected} ${sizes[size]} ${shapes[shape]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
