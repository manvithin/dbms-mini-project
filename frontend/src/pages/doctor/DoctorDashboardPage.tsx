import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  Clock3,
  FlaskConical,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../auth/AuthContext";
import type { AppointmentListResponse, DoctorSummaryResponse } from "../../types";
import { AppointmentCard } from "../../components/AppointmentCard";
import { Alert } from "../../components/Alert";
import { Avatar } from "../../components/Avatar";
import { LinkButton } from "../../components/Button";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { CardSkeleton, ListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatDateLong, formatTime, todayISO } from "../../utils/format";

export function DoctorDashboardPage() {
  const { user } = useAuth();
  const summaryState = useApi<DoctorSummaryResponse>("/doctor/summary");
  const todayState = useApi<AppointmentListResponse>("/doctor/appointments?scope=today&per_page=50");
  const summary = summaryState.data?.summary;
  const upcoming = summaryState.data?.upcoming_appointments ?? [];
  const todayAppointments = todayState.data?.appointments ?? [];
  const loading = summaryState.loading || todayState.loading;
  const error = summaryState.error || todayState.error;

  function retry() {
    summaryState.reload();
    todayState.reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow={formatDateLong(todayISO())}
        title="Your clinic at a glance"
        description="Today's list, waiting patients, and clinical follow ups."
        actions={
          <div className="flex items-center gap-3">
            <DoctorAvatar name={user?.name ?? "Doctor"} size="lg" />
            <LinkButton to="/doctor/appointments" icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}>
              All appointments
            </LinkButton>
          </div>
        }
      />

      {error ? (
        <div className="mb-5">
          <Alert variant="error" title="Dashboard information could not load">
            <p>{error}</p>
            <button type="button" onClick={retry} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </Alert>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Today's appointments" value={summary.today_total} hint="All visits assigned to you today" icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />} />
          <StatCard label="Waiting for you" value={summary.today_waiting} hint="Booked, confirmed, or checked in" icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} tone="gold" />
          <StatCard label="In consultation" value={summary.today_in_consultation} hint="Currently with you" icon={<Stethoscope className="h-5 w-5" aria-hidden="true" />} tone="violet" />
          <StatCard label="Completed today" value={summary.today_completed} hint="Visits with a finished consultation" icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />} tone="emerald" />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Today's appointment list</h2>
              <p className="mt-1 text-sm text-muted">Open a visit to update status or record clinical notes.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{todayAppointments.length} visits</span>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <ListSkeleton rows={4} />
            ) : todayAppointments.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="No appointments today"
                description="Your clinic list is clear. Upcoming visits will appear here on the day."
                action={<LinkButton to="/doctor/appointments" variant="secondary" size="sm">View upcoming appointments</LinkButton>}
              />
            ) : (
              todayAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.appointment_id}
                  appointment={appointment}
                  to={`/doctor/appointments/${appointment.appointment_id}`}
                  showPatient
                />
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-xl2 border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-soft">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-200/40" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Clinical follow ups</h2>
                <p className="mt-1 text-sm text-muted">Orders still waiting for a result.</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className="relative mt-4 font-display text-4xl font-semibold text-amber-900">{summary?.pending_tests ?? 0}</p>
            <p className="relative mt-1 text-xs leading-5 text-muted">Test orders across your patients that still need a result.</p>
            <Link to="/doctor/appointments?scope=upcoming" className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-950">
              Review upcoming visits
            </Link>
          </section>

          <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Next visits</h2>
                <p className="mt-1 text-sm text-muted">Your nearest upcoming appointments.</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            {loading ? (
              <div className="mt-4"><ListSkeleton rows={2} /></div>
            ) : upcoming.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-muted">No upcoming appointments are assigned to you.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {upcoming.map((appointment) => (
                  <li key={appointment.appointment_id} className="py-3 first:pt-0 last:pb-0">
                    <Link to={`/doctor/appointments/${appointment.appointment_id}`} className="flex items-start justify-between gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                      <div className="flex items-center gap-3">
                        <Avatar name={appointment.patient?.name ?? "Patient"} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-ink">{appointment.patient?.name}</p>
                          <p className="mt-0.5 text-xs text-muted">{formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}</p>
                        </div>
                      </div>
                      <StatusBadge status={appointment.status} subtle />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-5 text-white shadow-soft">
            <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full border border-white/10" aria-hidden="true" />
            <img src="/art/care-connection.svg" alt="" className="pointer-events-none absolute -bottom-8 -right-10 w-48 opacity-25" />
            <UsersRound className="relative h-6 w-6 text-brand-200" aria-hidden="true" />
            <h2 className="relative mt-3 font-display text-xl font-semibold">Patients under your care</h2>
            <p className="relative mt-2 font-display text-4xl font-semibold">{summary?.distinct_patients ?? 0}</p>
            <p className="relative mt-1 text-sm leading-6 text-brand-100">Distinct patients with an appointment in your list.</p>
            <p className="relative mt-3 text-xs leading-5 text-brand-200">Access is limited to appointments assigned to you.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
