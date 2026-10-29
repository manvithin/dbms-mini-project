const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return dateFormatter.format(parseDateOnly(value));
}

export function formatDateLong(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return longDateFormatter.format(parseDateOnly(value)).replace(",", "");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const [hourText, minuteText] = value.split(":");
  const date = new Date(1970, 0, 1, Number(hourText), Number(minuteText));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)} to ${formatTime(end)}`;
}

export function formatDateTimeLocal(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function ageFromDob(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;
  const dob = parseDateOnly(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDifference = now.getMonth() - dob.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function initials(name: string | null | undefined) {
  if (!name) return "GH";
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function formatDay(dayOfWeek: number) {
  return dayNames[dayOfWeek] ?? "Unknown day";
}

export function statusTone(status: string) {
  switch (status) {
    case "Booked":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "Ordered":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "Active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "Confirmed":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "Checked In":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "In Consultation":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Cancelled":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "No Show":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function statusDot(status: string) {
  switch (status) {
    case "Booked":
      return "bg-sky-500";
    case "Ordered":
      return "bg-sky-500";
    case "Confirmed":
      return "bg-teal-500";
    case "Checked In":
      return "bg-amber-500";
    case "In Consultation":
      return "bg-violet-500";
    case "Completed":
      return "bg-emerald-500";
    case "Cancelled":
      return "bg-rose-500";
    case "No Show":
      return "bg-slate-400";
    default:
      return "bg-slate-400";
  }
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function formatFollowUp(value: string | null | undefined) {
  if (!value) return "No follow up date set";
  return `Follow up on ${formatDate(value)}`;
}
