import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import type { AdminSummaryResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { LinkButton } from "../../components/Button";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { CardSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatTime, statusTone } from "../../utils/format";
import { departmentVisual } from "../../utils/visuals";

const statusOrder = ["Booked", "Confirmed", "Checked In", "In Consultation", "Completed", "Cancelled", "No Show"];
const barPalette = ["bg-brand-500", "bg-sky-500", "bg-rose-500", "bg-amber-500", "bg-violet-500", "bg-emerald-500", "bg-cyan-500", "bg-orange-500"];

export function AdminDashboardPage() {
  const state = useApi<AdminSummaryResponse>("/admin/summary");
  const summary = state.data?.summary;
  const recent = state.data?.recent_appointments ?? [];
  const maxDepartment = Math.max(1, ...(summary?.appointments_by_department.map((item) => item.appointment_count) ?? [0]));
  const todayAppointments = summary?.today_appointments ?? [];
  const recentCompleted = summary?.recent_completed_appointments ?? [];
  const recentCancelled = summary?.recent_cancelled_appointments ?? [];
  const pendingTestOrders = summary?.pending_test_orders ?? [];
  const recentPatients = summary?.recent_patients ?? [];
  const activeDoctors = summary?.active_doctor_preview ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Hospital operations overview"
        description="Live counts and recent activity across outpatient care."
        showBack={false}
        actions={
          <>
            <LinkButton to="/admin/doctors" variant="secondary" icon={<Stethoscope className="h-4 w-4" aria-hidden="true" />}>Manage doctors</LinkButton>
            <LinkButton to="/admin/appointments" icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}>Appointment register</LinkButton>
          </>
        }
      />

      {state.error ? (
        <div className="mb-5">
          <Alert variant="error" title="Summary could not load">
            <p>{state.error}</p>
            <button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </Alert>
        </div>
      ) : null}

      {state.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Patients"
              value={summary.patients}
              hint="Registered patient records"
              icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
              items={recentPatients.map((patient) => ({
                id: patient.patient_id,
                label: patient.name,
                meta: patient.blood_group,
                to: `/admin/appointments?search=${encodeURIComponent(patient.name)}`,
              }))}
              emptyText="No patient records have been added yet."
              to="/admin/appointments"
              linkLabel="Search patient appointments"
            />
            <StatCard
              label="Active doctors"
              value={summary.doctors}
              hint={`${summary.departments} departments in service`}
              icon={<Stethoscope className="h-5 w-5" aria-hidden="true" />}
              tone="sky"
              items={activeDoctors.map((doctor) => ({
                id: doctor.doctor_id,
                label: doctor.name,
                meta: doctor.department_name ?? doctor.specialization,
                to: "/admin/doctors",
              }))}
              emptyText="No active doctors are available."
              to="/admin/doctors"
              linkLabel="Manage doctors"
            />
            <StatCard
              label="Appointments today"
              value={summary.appointments_today}
              hint={`${summary.upcoming_appointments} upcoming in total`}
              icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}
              tone="gold"
              items={todayAppointments.map((appointment) => ({
                id: appointment.appointment_id,
                label: appointment.patient?.name ?? "Patient",
                meta: `${formatTime(appointment.appointment_time)} | ${appointment.status}`,
                to: `/admin/appointments/${appointment.appointment_id}`,
              }))}
              emptyText="No appointments are scheduled for today."
              to="/admin/appointments?scope=today"
              linkLabel="Open today's register"
            />
            <StatCard
              label="Pending tests"
              value={summary.pending_tests}
              hint="Orders still waiting for a result"
              icon={<FlaskConical className="h-5 w-5" aria-hidden="true" />}
              tone="rose"
              items={pendingTestOrders.map((test) => ({
                id: test.test_id,
                label: test.patient?.name ?? "Patient",
                meta: test.test_type,
                to: `/admin/appointments/${test.appointment_id}`,
              }))}
              emptyText="No test orders are waiting for a result."
              to="/admin/appointments"
              linkLabel="Review appointments"
            />
            <StatCard
              label="Completed visits"
              value={summary.completed_appointments}
              hint="Finished outpatient consultations"
              icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
              tone="emerald"
              items={recentCompleted.map((appointment) => ({
                id: appointment.appointment_id,
                label: appointment.patient?.name ?? "Patient",
                meta: formatDate(appointment.appointment_date),
                to: `/admin/appointments/${appointment.appointment_id}`,
              }))}
              emptyText="No completed visits have been recorded yet."
              to="/admin/appointments?status=Completed"
              linkLabel="Open completed visits"
            />
            <StatCard
              label="Cancelled visits"
              value={summary.cancelled_appointments}
              hint="Appointments cancelled by any user"
              icon={<Activity className="h-5 w-5" aria-hidden="true" />}
              tone="orange"
              items={recentCancelled.map((appointment) => ({
                id: appointment.appointment_id,
                label: appointment.patient?.name ?? "Patient",
                meta: formatDate(appointment.appointment_date),
                to: `/admin/appointments/${appointment.appointment_id}`,
              }))}
              emptyText="No cancelled visits have been recorded."
              to="/admin/appointments?status=Cancelled"
              linkLabel="Open cancelled visits"
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Appointments by department</h2>
                  <p className="mt-1 text-sm text-muted">All recorded visits, grouped by department.</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {summary.appointments_by_department.map((item, index) => {
                  const visual = departmentVisual(item.department_name);
                  return (
                    <Link
                      key={item.department_name}
                      to={`/admin/appointments?department_id=${item.department_id}`}
                      className="group block rounded-xl px-2 py-1.5 transition hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2 font-medium text-ink">
                          <img src={visual.image} alt="" className="h-6 w-6 rounded-lg" />
                          <span className="truncate">{item.department_name}</span>
                        </span>
                        <span className="font-semibold text-muted">{item.appointment_count}</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${barPalette[index % barPalette.length]}`}
                          style={{ width: `${Math.max(4, (item.appointment_count / maxDepartment) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Appointment status</h2>
                  <p className="mt-1 text-sm text-muted">All time status distribution.</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {statusOrder.map((status) => (
                  <Link
                    key={status}
                    to={`/admin/appointments?status=${encodeURIComponent(status)}`}
                    className={`rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${statusTone(status)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{status}</span>
                      <span className="font-display text-xl font-semibold">{summary.status_counts[status] ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <Link to="/admin/appointments?status=Completed" className="rounded-xl bg-emerald-50 px-3 py-2.5 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-emerald-900">{summary.completed_appointments}</p>
                </Link>
                <Link to="/admin/appointments?status=Cancelled" className="rounded-xl bg-rose-50 px-3 py-2.5 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Cancelled</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-rose-900">{summary.cancelled_appointments}</p>
                </Link>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-xl2 border border-line bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Recent appointments</h2>
                <p className="mt-1 text-sm text-muted">The latest bookings across all departments.</p>
              </div>
              <Link to="/admin/appointments" className="text-sm font-semibold text-brand-700 hover:text-brand-900">Open register</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((appointment) => (
                    <tr key={appointment.appointment_id}>
                      <td>
                        <p className="font-semibold text-ink">{appointment.patient?.name}</p>
                        <p className="mt-0.5 text-xs text-muted">#{appointment.appointment_id}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <DoctorAvatar name={appointment.doctor?.name ?? "Doctor"} size="sm" />
                          <div>
                            <p className="font-medium text-ink">{appointment.doctor?.name}</p>
                            <p className="mt-0.5 text-xs text-muted">{appointment.doctor?.department_name}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="font-medium text-ink">{formatDate(appointment.appointment_date)}</p>
                        <p className="mt-0.5 text-xs text-muted">{formatTime(appointment.appointment_time)}</p>
                      </td>
                      <td><StatusBadge status={appointment.status} /></td>
                      <td className="text-right">
                        <Link to={`/admin/appointments/${appointment.appointment_id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recent.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted">No appointments have been created yet.</p>
            ) : null}
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link to="/admin/departments" className="group relative overflow-hidden rounded-xl2 border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 flex items-center gap-1 font-display text-lg font-semibold text-ink">Departments <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" /></p>
              <p className="mt-1 text-sm text-muted">Review and update service descriptions.</p>
            </Link>
            <Link to="/admin/schedules" className="group relative overflow-hidden rounded-xl2 border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 flex items-center gap-1 font-display text-lg font-semibold text-ink">Clinic schedules <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" /></p>
              <p className="mt-1 text-sm text-muted">Set clinic days, hours, and slot length.</p>
            </Link>
            <Link to="/admin/time-off" className="group relative overflow-hidden rounded-xl2 border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-3 flex items-center gap-1 font-display text-lg font-semibold text-ink">Doctor time off <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" /></p>
              <p className="mt-1 text-sm text-muted">Block unavailable clinic time.</p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
