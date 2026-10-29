import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, Clock3, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { Appointment } from "../types";
import { Avatar } from "./Avatar";
import { DoctorAvatar } from "./DoctorAvatar";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatTime, parseDateOnly } from "../utils/format";

export function AppointmentCard({
  appointment,
  to,
  actions,
  showPatient = false,
}: {
  appointment: Appointment;
  to: string;
  actions?: ReactNode;
  showPatient?: boolean;
}) {
  const date = parseDateOnly(appointment.appointment_date);
  const day = new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:border-brand-200 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800">
          <span className="text-[10px] font-bold uppercase tracking-wide">{month}</span>
          <span className="font-display text-2xl font-semibold leading-tight">{day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={appointment.status} />
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatTime(appointment.appointment_time)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            {showPatient ? (
              <Avatar name={appointment.patient?.name ?? "Patient"} size="md" />
            ) : (
              <DoctorAvatar name={appointment.doctor?.name ?? "Doctor"} size="md" />
            )}
            <div className="min-w-0">
              <h3 className="font-display text-xl font-semibold text-ink">
                {showPatient ? appointment.patient?.name : appointment.doctor?.name}
              </h3>
              <p className="mt-0.5 text-sm text-muted">
                {showPatient
                  ? `${appointment.doctor?.name ?? "Doctor"} | ${appointment.doctor?.department_name ?? "Department"}`
                  : `${appointment.doctor?.department_name ?? "Department"} | ${appointment.doctor?.specialization ?? ""}`}
              </p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{appointment.reason_for_visit}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(appointment.appointment_date)}
            </span>
            {showPatient && appointment.patient ? (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {appointment.patient.blood_group}
              </span>
            ) : null}
            {appointment.test_count > 0 ? <span>{appointment.test_count} {appointment.test_count === 1 ? "test" : "tests"}</span> : null}
            {appointment.has_diagnosis ? <span>Diagnosis recorded</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          {actions}
          <Link
            to={to}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            View details
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function DoctorMini({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
      <DoctorAvatar name={name} size="sm" />
      {name}
    </span>
  );
}
