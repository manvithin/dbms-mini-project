import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import type { AppointmentDetailResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { PrintFooter, PrintHeader, PrintSection } from "../../components/PrintHeader";
import { PageLoading } from "../../components/Skeleton";
import { ageFromDob, formatDate, formatDateLong, formatDateTime, formatTime } from "../../utils/format";

export function PrintConfirmationPage() {
  const { appointmentId } = useParams();
  const state = useApi<AppointmentDetailResponse>(
    appointmentId ? `/appointments/${appointmentId}` : null,
  );

  if (state.loading) return <PageLoading label="Preparing appointment confirmation" />;
  if (state.error || !state.data) {
    return (
      <Alert variant="error" title="Appointment confirmation could not load">
        {state.error ?? "The appointment was not found or you do not have access to it."}
      </Alert>
    );
  }

  const appointment = state.data.appointment;
  const patient = appointment.patient;
  const doctor = appointment.doctor;

  return (
    <div>
      <PrintHeader
        documentTitle="Appointment confirmation"
        subtitle={`Appointment #${appointment.appointment_id} | ${appointment.status}`}
      />

      <PrintSection title="Patient details" breakAvoid>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Patient name</dt>
            <dd className="mt-0.5 font-semibold text-ink">{patient?.name ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Patient record number</dt>
            <dd className="mt-0.5 text-ink">#{appointment.patient_id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Date of birth</dt>
            <dd className="mt-0.5 text-ink">
              {formatDate(patient?.date_of_birth)} | {ageFromDob(patient?.date_of_birth) ?? "Unknown"} years
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Phone</dt>
            <dd className="mt-0.5 text-ink">{patient?.phone ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Gender</dt>
            <dd className="mt-0.5 text-ink">{patient?.gender ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Blood group</dt>
            <dd className="mt-0.5 text-ink">{patient?.blood_group ?? "Not recorded"}</dd>
          </div>
        </dl>
      </PrintSection>

      <PrintSection title="Visit details" breakAvoid>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Date</dt>
            <dd className="mt-0.5 font-semibold text-ink">{formatDateLong(appointment.appointment_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Time</dt>
            <dd className="mt-0.5 font-semibold text-ink">{formatTime(appointment.appointment_time)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Doctor</dt>
            <dd className="mt-0.5 text-ink">{doctor?.name ?? "Not recorded"}</dd>
            <dd className="text-xs text-muted">{doctor?.specialization ?? "Outpatient care"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Department</dt>
            <dd className="mt-0.5 text-ink">{doctor?.department_name ?? "Not recorded"}</dd>
            <dd className="text-xs text-muted">Hospital desk {doctor?.phone ?? "not recorded"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Reason for visit</dt>
            <dd className="mt-0.5 leading-6 text-ink">{appointment.reason_for_visit}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Booked on</dt>
            <dd className="mt-0.5 text-ink">{formatDateTime(appointment.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Current status</dt>
            <dd className="mt-0.5 font-semibold text-ink">{appointment.status}</dd>
          </div>
        </dl>
      </PrintSection>

      <PrintSection title="Before you arrive" breakAvoid>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-ink">
          <li>Please arrive 15 minutes before your appointment time.</li>
          <li>Bring a photo identity document and any current prescriptions or test reports.</li>
          <li>Tell reception if you need wheelchair access or other assistance.</li>
          <li>Appointments can be cancelled from the patient portal up to two hours before the start time.</li>
        </ul>
      </PrintSection>

      <PrintFooter note="Keep this confirmation for your visit and show it at the outpatient reception desk." />
    </div>
  );
}
