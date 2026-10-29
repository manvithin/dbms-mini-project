import { Link, useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import type { AppointmentDetailResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { PrintFooter, PrintHeader, PrintSection } from "../../components/PrintHeader";
import { PageLoading } from "../../components/Skeleton";
import { formatDateLong, formatDateTime, formatTime } from "../../utils/format";

export function PrintTestsPage() {
  const { appointmentId } = useParams();
  const state = useApi<AppointmentDetailResponse>(
    appointmentId ? `/appointments/${appointmentId}` : null,
  );

  if (state.loading) return <PageLoading label="Preparing test results" />;
  if (state.error || !state.data) {
    return (
      <Alert variant="error" title="Test results could not load">
        {state.error ?? "The appointment was not found or you do not have access to it."}
      </Alert>
    );
  }

  const appointment = state.data.appointment;
  const patient = appointment.patient;
  const doctor = appointment.doctor;
  const tests = appointment.tests ?? [];

  return (
    <div>
      <PrintHeader
        documentTitle="Diagnostic test results"
        subtitle={`Appointment #${appointment.appointment_id} | ${formatDateLong(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)}`}
      />

      <div className="no-print mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          to={`/print/appointments/${appointment.appointment_id}/record`}
          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
        >
          Print the full clinical record
        </Link>
        <Link
          to={`/print/appointments/${appointment.appointment_id}/confirmation`}
          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
        >
          Print appointment confirmation
        </Link>
      </div>

      <PrintSection title="Patient and visit" breakAvoid>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Patient</dt>
            <dd className="mt-0.5 font-semibold text-ink">{patient?.name ?? "Not recorded"}</dd>
            <dd className="text-xs text-muted">Record #{appointment.patient_id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Doctor</dt>
            <dd className="mt-0.5 text-ink">{doctor?.name ?? "Not recorded"}</dd>
            <dd className="text-xs text-muted">
              {doctor?.specialization ?? "Outpatient care"} | {doctor?.department_name ?? "Department"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Visit date</dt>
            <dd className="mt-0.5 text-ink">{formatDateLong(appointment.appointment_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Visit status</dt>
            <dd className="mt-0.5 text-ink">{appointment.status}</dd>
          </div>
        </dl>
      </PrintSection>

      <PrintSection title="Ordered tests and results">
        {tests.length === 0 ? (
          <p className="text-sm leading-6 text-muted">No diagnostic tests were ordered for this visit.</p>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <article key={test.test_id} className="print-break-avoid border border-line px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-ink">{test.test_type}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{test.status}</p>
                </div>
                <p className="mt-1 text-xs text-muted">Ordered {formatDateTime(test.order_date)}</p>
                {test.notes ? <p className="mt-2 text-sm leading-6 text-ink">{test.notes}</p> : null}
                {test.result ? (
                  <div className="mt-3 border-l-2 border-brand-300 pl-3">
                    <p className="text-sm font-semibold text-ink">Result</p>
                    <p className="mt-0.5 text-sm leading-6 text-ink">{test.result.result_summary}</p>
                    {test.result.remarks ? (
                      <p className="mt-0.5 text-sm leading-6 text-muted">{test.result.remarks}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">Recorded {formatDateTime(test.result.result_date)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">The result is not available yet.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </PrintSection>

      <PrintFooter note="A test result is evidence for the treating doctor and is not a diagnosis by itself. Discuss the result with your care team." />
    </div>
  );
}
