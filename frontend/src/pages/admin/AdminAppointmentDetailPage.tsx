import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileHeart,
  Phone,
  Printer,
  UserRound,
  XCircle,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, errorMessage } from "../../api/client";
import type { AppointmentDetailResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Avatar } from "../../components/Avatar";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { Button, LinkButton } from "../../components/Button";
import { SectionCard } from "../../components/Card";
import { ClinicalRecord } from "../../components/ClinicalRecord";
import { ConfirmDialog } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { PageLoading } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusTimeline } from "../../components/StatusTimeline";
import { ageFromDob, formatDate, formatDateLong, formatTime } from "../../utils/format";

export function AdminAppointmentDetailPage() {
  const { appointmentId } = useParams();
  const { push } = useToast();
  const state = useApi<AppointmentDetailResponse>(appointmentId ? `/appointments/${appointmentId}` : null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  if (state.loading) return <PageLoading label="Loading appointment" />;
  if (state.error || !state.data) {
    return (
      <Alert variant="error" title="Appointment could not load">
        <p>{state.error ?? "The appointment was not found."}</p>
        <div className="mt-3 flex gap-3">
          <Button variant="secondary" size="sm" onClick={state.reload}>Try again</Button>
          <LinkButton to="/admin/appointments" variant="ghost" size="sm">Back to register</LinkButton>
        </div>
      </Alert>
    );
  }

  const appointment = state.data.appointment;
  const patient = appointment.patient;
  const canCancel = appointment.permissions?.can_cancel;

  async function handleCancel() {
    setCancelling(true);
    setError("");
    try {
      await api.post(`/admin/appointments/${appointment.appointment_id}/cancel`);
      push("Appointment cancelled.", "success");
      setCancelOpen(false);
      state.reload();
    } catch (cancelError) {
      setError(errorMessage(cancelError));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <Link to="/admin/appointments" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to appointment register
      </Link>
      <PageHeader
        showBack={false}
        eyebrow={`Administration | Appointment #${appointment.appointment_id}`}
        title={patient?.name ?? "Appointment record"}
        description="Full administrative view of this outpatient visit. Clinical notes remain read only here."
        actions={
          <>
            <LinkButton to={`/print/appointments/${appointment.appointment_id}/confirmation`} variant="secondary" icon={<Printer className="h-4 w-4" aria-hidden="true" />}>
              Print confirmation
            </LinkButton>
            <LinkButton to={`/print/appointments/${appointment.appointment_id}/record`} variant="secondary" icon={<FileHeart className="h-4 w-4" aria-hidden="true" />}>
              Print record
            </LinkButton>
            {canCancel ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)} icon={<XCircle className="h-4 w-4" aria-hidden="true" />}>Cancel appointment</Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <div className="mb-5"><Alert variant="error" title="The appointment could not be cancelled" onDismiss={() => setError("")}>{error}</Alert></div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Patient and visit" description="The patient, care team, and appointment context.">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={patient?.name ?? "Patient"} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-ink">{patient?.name}</h2>
                <StatusBadge status={appointment.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {patient?.gender} | {ageFromDob(patient?.date_of_birth) ?? "Unknown"} years | Blood group {patient?.blood_group}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{patient?.phone}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <DoctorAvatar name={appointment.doctor?.name ?? "Doctor"} size="md" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Doctor</p>
                <p className="mt-1 text-sm font-semibold text-ink">{appointment.doctor?.name}</p>
                <p className="text-xs text-muted">{appointment.doctor?.department_name} | {appointment.doctor?.specialization}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Date</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatDateLong(appointment.appointment_date)}</p>
                <p className="inline-flex items-center gap-1 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{formatTime(appointment.appointment_time)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Patient record</p>
                <p className="mt-1 text-sm font-semibold text-ink">#{appointment.patient_id}</p>
                <p className="text-xs text-muted">Created {formatDate(appointment.created_at.slice(0, 10))}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><FileHeart className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Clinical work</p>
                <p className="mt-1 text-sm font-semibold text-ink">{appointment.test_count} tests | {appointment.has_diagnosis ? "Diagnosis recorded" : "No diagnosis"}</p>
                <p className="text-xs text-muted">{appointment.has_prescription ? "Treatment plan recorded" : "No treatment plan"}</p>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-line bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reason for visit</p>
            <p className="mt-1 text-sm leading-6 text-ink">{appointment.reason_for_visit}</p>
          </div>
        </SectionCard>

        <SectionCard title="Status timeline" description="Recorded automatically by the audit trigger.">
          <StatusTimeline history={appointment.status_history ?? []} />
        </SectionCard>
      </div>

      <SectionCard title="Clinical record" description="Read only administrative view of tests, diagnosis, and treatment." className="mt-6">
        <ClinicalRecord appointment={appointment} compact />
      </SectionCard>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => { if (!cancelling) setCancelOpen(false); }}
        onConfirm={handleCancel}
        title="Cancel this appointment?"
        description={`${patient?.name ?? "This patient"} with ${appointment.doctor?.name ?? "the doctor"} on ${formatDateLong(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)}.`}
        confirmLabel="Cancel appointment"
        loading={cancelling}
      />
    </div>
  );
}
