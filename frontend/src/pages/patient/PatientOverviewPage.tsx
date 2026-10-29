import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  FileHeart,
  FileText,
  HeartPulse,
  Plus,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import type { AppointmentListResponse, ProfileResponse, RecordListResponse } from "../../types";
import { AppointmentCard } from "../../components/AppointmentCard";
import { Alert } from "../../components/Alert";
import { Button, LinkButton } from "../../components/Button";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { CardSkeleton, ListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatDateLong, formatTime, todayISO } from "../../utils/format";
import { departmentVisual } from "../../utils/visuals";

export function PatientOverviewPage() {
  const profileState = useApi<ProfileResponse>("/patients/me");
  const upcomingState = useApi<AppointmentListResponse>("/patients/me/appointments?scope=upcoming&per_page=3");
  const recordsState = useApi<RecordListResponse>("/patients/me/records?per_page=3");

  const profile = profileState.data?.patient;
  const upcoming = upcomingState.data?.appointments ?? [];
  const records = recordsState.data?.records ?? [];
  const next = upcoming[0];
  const loading = profileState.loading || upcomingState.loading || recordsState.loading;
  const error = profileState.error || upcomingState.error || recordsState.error;

  function retryAll() {
    profileState.reload();
    upcomingState.reload();
    recordsState.reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow={formatDateLong(todayISO())}
        title={profile ? `Good day, ${profile.name.split(" ")[0]}` : "Your care overview"}
        description="Your next visit, recent clinical notes, and the fastest route to care."
        actions={
          <LinkButton to="/patient/book" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Book appointment
          </LinkButton>
        }
      />

      {error ? (
        <div className="mb-5">
          <Alert variant="error" title="Some dashboard information could not load">
            <p>{error}</p>
            <button type="button" onClick={retryAll} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </Alert>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2"><CardSkeleton /></div>
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-6 shadow-soft lg:col-span-2">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-bl-full bg-brand-100/60" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-sky-100/50 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Next appointment</p>
                  {next ? (
                    <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                      {formatDate(next.appointment_date)} at {formatTime(next.appointment_time)}
                    </h2>
                  ) : (
                    <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">No upcoming visit</h2>
                  )}
                </div>
                {next ? <StatusBadge status={next.status} /> : null}
              </div>

              {next ? (
                <>
                  <div className="mt-5 grid gap-4 rounded-xl border border-white bg-white/80 p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex items-start gap-3">
                      <DoctorAvatar name={next.doctor?.name ?? "Care team"} size="lg" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <Stethoscope className="h-4 w-4 text-brand-700" aria-hidden="true" />
                          {next.doctor?.name ?? "Care team"}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {next.doctor?.department_name ?? "Department"} | {next.doctor?.specialization ?? "Outpatient care"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">{next.reason_for_visit}</p>
                      </div>
                    </div>
                    <LinkButton to={`/patient/appointments/${next.appointment_id}`} size="sm" variant="secondary">
                      Open appointment
                    </LinkButton>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 font-semibold text-brand-800">Appointment #{next.appointment_id}</span>
                    {next.test_count > 0 ? <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-800">{next.test_count} {next.test_count === 1 ? "test" : "tests"}</span> : null}
                    {next.has_prescription ? <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-800">Treatment plan ready</span> : null}
                  </div>
                </>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-brand-200 bg-white/70 px-5 py-8">
                  <p className="text-sm leading-6 text-muted">Book a visit when you need care. Your doctor will see your full outpatient record at the consultation.</p>
                  <LinkButton to="/patient/book" className="mt-4" icon={<CalendarCheck2 className="h-4 w-4" aria-hidden="true" />}>
                    Find an appointment
                  </LinkButton>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-4 border-t border-brand-100 pt-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Arrive 15 minutes before your slot</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Records visible only to you and your doctor</span>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-5 text-white shadow-soft">
              <img src="/art/care-connection.svg" alt="" className="pointer-events-none absolute -bottom-10 -right-12 w-52 opacity-25" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-100">
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="relative mt-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-200">Your health profile</p>
              <p className="relative mt-1 font-display text-2xl font-semibold">{profile?.blood_group ?? "Not recorded"}</p>
              <p className="relative mt-1 text-sm leading-6 text-brand-100">
                {profile?.medical_history ? profile.medical_history : "No medical history has been added to your profile."}
              </p>
              <Link to="/patient/profile" className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white underline-offset-4 hover:underline">
                Review profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3">
              <Link to="/patient/appointments" className="group relative overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-display text-2xl font-semibold text-sky-900">{upcomingState.data?.pagination.total ?? upcoming.length}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-muted">Upcoming visits</p>
                {next ? (
                  <div className="mt-2 rounded-lg bg-white/75 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-ink">{next.doctor?.name ?? "Care team"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatDate(next.appointment_date)} at {formatTime(next.appointment_time)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">No upcoming visit booked.</p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800">
                  View appointments
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
              <Link to="/patient/records" className="group relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-display text-2xl font-semibold text-violet-900">{recordsState.data?.pagination.total ?? 0}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-muted">Clinical records</p>
                {records[0] ? (
                  <div className="mt-2 rounded-lg bg-white/75 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-ink">{records[0].diagnosis?.diagnosis_description ?? "Clinical notes available"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{formatDate(records[0].appointment_date)} | {records[0].doctor?.name ?? "Care team"}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted">No clinical records yet.</p>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-800">
                  View records
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Recent appointments</h2>
              <p className="mt-1 text-sm text-muted">Your three nearest upcoming visits.</p>
            </div>
            <Link to="/patient/appointments" className="text-sm font-semibold text-brand-700 hover:text-brand-900">View all</Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <ListSkeleton rows={3} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-5 w-5" />}
                title="No upcoming appointments"
                description="When you book a visit, it will appear here with the current status."
                action={<LinkButton to="/patient/book" size="sm">Book an appointment</LinkButton>}
              />
            ) : (
              upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.appointment_id}
                  appointment={appointment}
                  to={`/patient/appointments/${appointment.appointment_id}`}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Care notes ready</h2>
              <p className="mt-1 text-sm text-muted">Recent visits with test results or a diagnosis.</p>
            </div>
            <Link to="/patient/records" className="text-sm font-semibold text-brand-700 hover:text-brand-900">View records</Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? (
              <ListSkeleton rows={3} />
            ) : records.length === 0 ? (
              <EmptyState
                icon={<FileHeart className="h-5 w-5" />}
                title="No clinical records yet"
                description="After a consultation, test results, diagnosis, and treatment notes will appear here."
              />
            ) : (
              records.map((record) => {
                const visual = departmentVisual(record.doctor?.department_name);
                return (
                  <Link
                    key={record.appointment_id}
                    to={`/patient/appointments/${record.appointment_id}`}
                    className="group flex items-start gap-3 rounded-xl border border-line p-4 transition hover:border-brand-200 hover:bg-brand-50/30"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.soft} ${visual.text}`}>
                      <FileHeart className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{record.diagnosis?.diagnosis_description ?? "Diagnostic tests recorded"}</p>
                        <StatusBadge status={record.status} subtle />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(record.appointment_date)} | {record.doctor?.name ?? "Care team"}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                        {record.diagnosis?.prescription?.treatment_plan ?? record.tests?.[0]?.result?.result_summary ?? "Open the visit to review the clinical details."}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="relative mt-6 overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-sky-50 p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Need care sooner?</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Check the public doctor directory for the next open clinic slot, or contact reception for urgent help.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton to="/" variant="secondary" icon={<Stethoscope className="h-4 w-4" aria-hidden="true" />}>Doctor directory</LinkButton>
            <Button variant="ghost" onClick={() => { window.location.href = "tel:+918040001200"; }} icon={<CalendarCheck2 className="h-4 w-4" aria-hidden="true" />}>
              Call reception
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
