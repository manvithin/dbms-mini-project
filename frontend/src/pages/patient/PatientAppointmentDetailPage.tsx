import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileHeart,
  Phone,
  Printer,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, errorMessage } from "../../api/client";
import type { AppointmentDetailResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { Button, LinkButton } from "../../components/Button";
import { SectionCard } from "../../components/Card";
import { ClinicalRecord } from "../../components/ClinicalRecord";
import { ConfirmDialog } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { PageLoading } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusTimeline } from "../../components/StatusTimeline";
import { formatDateLong, formatTime } from "../../utils/format";
import { departmentVisual } from "../../utils/visuals";

export function PatientAppointmentDetailPage() {
  const { appointmentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useToast();
  const state = useApi<AppointmentDetailResponse>(appointmentId ? `/appointments/${appointmentId}` : null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const booked = searchParams.get("booked") === "1";

  if (state.loading) return <PageLoading label="Loading appointment" />;
  if (state.error || !state.data) {
    return (
      <div>
        <Alert variant="error" title="Appointment could not load">
          <p>{state.error ?? "The appointment was not found."}</p>
          <div className="mt-3 flex gap-3">
            <Button variant="secondary" size="sm" onClick={state.reload}>Try again</Button>
            <LinkButton to="/patient/appointments" variant="ghost" size="sm">Back to appointments</LinkButton>
          </div>
        </Alert>
      </div>
    );
  }

  const appointment = state.data.appointment;
  const permissions = appointment.permissions;

  async function handleCancel() {
    setCancelling(true);
    setCancelError("");
    try {
      await api.post(`/appointments/${appointment.appointment_id}/cancel`);
      push("Appointment cancelled.", "success");
      setCancelOpen(false);
      state.reload();
    } catch (error) {
      setCancelError(errorMessage(error));
    } finally {
      setCancelling(false);
    }
  }

  function clearBookedNotice() {
    const next = new URLSearchParams(searchParams);
    next.delete("booked");
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <Link to="/patient/appointments" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to my appointments
      </Link>
      <PageHeader
        eyebrow={`Appointment #${appointment.appointment_id}`}
        title="Visit details"
        description="Everything about this appointment, including the clinical record when it is ready."
        actions={
          <>
            <LinkButton to={`/print/appointments/${appointment.appointment_id}/confirmation`} variant="secondary" icon={<Printer className="h-4 w-4" aria-hidden="true" />}>
              Print confirmation
            </LinkButton>
            <LinkButton to={`/print/appointments/${appointment.appointment_id}/record`} variant="secondary" icon={<FileHeart className="h-4 w-4" aria-hidden="true" />}>
              Print record
            </LinkButton>
            {permissions?.can_cancel ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)} icon={<XCircle className="h-4 w-4" aria-hidden="true" />}>
                Cancel appointment
              </Button>
            ) : null}
          </>
        }
      />

      {booked ? (
        <div className="mb-5">
          <Alert variant="success" title="Your appointment is booked" onDismiss={clearBookedNotice}>
            The appointment is saved and visible to your care team. Please arrive 15 minutes before your slot.
          </Alert>
        </div>
      ) : null}

      {cancelError ? (
        <div className="mb-5">
          <Alert variant="error" title="The appointment could not be cancelled" onDismiss={() => setCancelError("")}>
            {cancelError}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Appointment summary" description="The confirmed details for this visit.">
          <div className="flex flex-wrap items-start gap-4">
            <DoctorAvatar name={appointment.doctor?.name ?? "Care team"} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-ink">{appointment.doctor?.name ?? "Care team"}</h2>
                <StatusBadge status={appointment.status} />
              </div>
              <p className="mt-1 text-sm font-medium text-brand-700">{appointment.doctor?.specialization ?? "Outpatient care"}</p>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${departmentVisual(appointment.doctor?.department_name).chip}`}>
                <img src={departmentVisual(appointment.doctor?.department_name).image} alt="" className="h-3.5 w-3.5 rounded" />
                {appointment.doctor?.department_name ?? "Department"}
              </span>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Date</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{formatDateLong(appointment.appointment_date)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Time</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{formatTime(appointment.appointment_time)}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Stethoscope className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Department</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{appointment.doctor?.department_name ?? "Not recorded"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Hospital desk</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{appointment.doctor?.phone ?? "Not recorded"}</dd>
              </div>
            </div>
          </dl>

          <div className="mt-5 rounded-xl border border-line bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reason for visit</p>
            <p className="mt-1 text-sm leading-6 text-ink">{appointment.reason_for_visit}</p>
          </div>

          {!permissions?.can_cancel && (appointment.status === "Booked" || appointment.status === "Confirmed") ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              This appointment is within the two hour cancellation window. Please call reception if you need urgent help.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard title="Visit progress" description="Status changes recorded by the care team.">
          <StatusTimeline history={appointment.status_history ?? []} />
        </SectionCard>
      </div>

      <SectionCard
        title="Clinical record"
        description="Tests, diagnosis, treatment plan, and follow up information for this visit."
        className="mt-6"
      >
        <ClinicalRecord appointment={appointment} compact />
      </SectionCard>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl2 border border-line bg-white p-5 shadow-soft">
        <div>
          <p className="text-sm font-semibold text-ink">Need to speak with the hospital?</p>
          <p className="mt-1 text-xs leading-5 text-muted">Reception can help with directions, accessibility needs, or a visit change.</p>
        </div>
        <Button variant="secondary" onClick={() => { window.location.href = "tel:+918040001200"; }} icon={<Phone className="h-4 w-4" aria-hidden="true" />}>
          Call reception
        </Button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => { if (!cancelling) setCancelOpen(false); }}
        onConfirm={handleCancel}
        title="Cancel this appointment?"
        description={`${formatDateLong(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)} with ${appointment.doctor?.name ?? "your doctor"}.`}
        confirmLabel="Cancel appointment"
        loading={cancelling}
      />
    </div>
  );
}
