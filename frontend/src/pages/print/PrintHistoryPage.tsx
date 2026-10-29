import { useApi } from "../../hooks/useApi";
import type { Appointment, AppointmentListResponse } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { Alert } from "../../components/Alert";
import { PrintFooter, PrintHeader, PrintSection } from "../../components/PrintHeader";
import { PageLoading } from "../../components/Skeleton";
import { formatDate, formatTime, pluralize } from "../../utils/format";

const activeStatuses = new Set(["Booked", "Confirmed", "Checked In", "In Consultation"]);

function clinicalSummary(appointment: Appointment) {
  const parts: string[] = [];
  if (appointment.test_count > 0) {
    parts.push(`${appointment.test_count} ${pluralize(appointment.test_count, "test")}`);
  }
  if (appointment.has_diagnosis) parts.push("Diagnosis");
  if (appointment.has_prescription) parts.push("Prescription");
  return parts.length > 0 ? parts.join(", ") : "No clinical record";
}

export function PrintHistoryPage() {
  const { user } = useAuth();
  const state = useApi<AppointmentListResponse>("/patients/me/appointments?per_page=50&scope=all");
  const appointments = state.data?.appointments ?? [];
  const pagination = state.data?.pagination;

  if (state.loading) return <PageLoading label="Preparing appointment history" />;
  if (state.error || !state.data) {
    return (
      <Alert variant="error" title="Appointment history could not load">
        {state.error ?? "The appointment history was not available."}
      </Alert>
    );
  }

  const patientName = user?.patient?.name ?? appointments[0]?.patient?.name ?? "Patient";
  const patientId = user?.patient_id ?? appointments[0]?.patient_id;
  const completed = appointments.filter((appointment) => appointment.status === "Completed").length;
  const cancelled = appointments.filter((appointment) => appointment.status === "Cancelled").length;
  const active = appointments.filter((appointment) => activeStatuses.has(appointment.status)).length;

  return (
    <div>
      <PrintHeader
        documentTitle="Appointment history"
        subtitle={`${patientName}${patientId ? ` | Record #${patientId}` : ""}`}
      />

      <PrintSection title="Summary" breakAvoid>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="border border-line px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Appointments</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">{pagination?.total ?? appointments.length}</dd>
          </div>
          <div className="border border-line px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Completed</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">{completed}</dd>
          </div>
          <div className="border border-line px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Open visits</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">{active}</dd>
          </div>
          <div className="border border-line px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Cancelled</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">{cancelled}</dd>
          </div>
        </dl>
      </PrintSection>

      <PrintSection title="Recorded appointments">
        {appointments.length === 0 ? (
          <p className="text-sm leading-6 text-muted">No appointments have been booked from this account.</p>
        ) : (
          <>
            <table className="w-full border-collapse text-left text-xs">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[17%]" />
                <col className="w-[21%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-ink/30 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-2 py-2">Date and time</th>
                  <th className="px-2 py-2">Doctor</th>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Clinical record</th>
                  <th className="px-2 py-2">Reason for visit</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.appointment_id} className="border-b border-line align-top">
                    <td className="px-2 py-2">
                      <p className="font-semibold text-ink">{formatDate(appointment.appointment_date)}</p>
                      <p className="text-muted">{formatTime(appointment.appointment_time)}</p>
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-semibold text-ink">{appointment.doctor?.name ?? "Not recorded"}</p>
                      <p className="text-muted">{appointment.doctor?.specialization ?? "Outpatient care"}</p>
                    </td>
                    <td className="px-2 py-2 text-ink">{appointment.doctor?.department_name ?? "Not recorded"}</td>
                    <td className="px-2 py-2 text-ink">{appointment.status}</td>
                    <td className="px-2 py-2 text-ink">{clinicalSummary(appointment)}</td>
                    <td className="px-2 py-2 leading-5 text-ink">{appointment.reason_for_visit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && pagination.total > appointments.length ? (
              <p className="mt-3 text-xs leading-5 text-muted">
                Showing the {appointments.length} most recent of {pagination.total} appointments. Open the patient portal for the complete list.
              </p>
            ) : null}
          </>
        )}
      </PrintSection>

      <PrintFooter note="This history lists appointments recorded in the patient portal. Contact reception if a visit is missing from this list." />
    </div>
  );
}
