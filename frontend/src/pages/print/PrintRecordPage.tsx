import { Link, useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import type { AppointmentDetailResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { PrintFooter, PrintHeader, PrintSection } from "../../components/PrintHeader";
import { PageLoading } from "../../components/Skeleton";
import {
  ageFromDob,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatFollowUp,
  formatTime,
} from "../../utils/format";

export function PrintRecordPage() {
  const { appointmentId } = useParams();
  const state = useApi<AppointmentDetailResponse>(
    appointmentId ? `/appointments/${appointmentId}` : null,
  );

  if (state.loading) return <PageLoading label="Preparing clinical record" />;
  if (state.error || !state.data) {
    return (
      <Alert variant="error" title="Clinical record could not load">
        {state.error ?? "The appointment was not found or you do not have access to it."}
      </Alert>
    );
  }

  const appointment = state.data.appointment;
  const patient = appointment.patient;
  const doctor = appointment.doctor;
  const tests = appointment.tests ?? [];
  const diagnosis = appointment.diagnosis;
  const prescription = diagnosis?.prescription;

  return (
    <div>
      <PrintHeader
        documentTitle="Outpatient clinical record"
        subtitle={`Appointment #${appointment.appointment_id} | ${formatDateLong(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)}`}
      />

      <div className="no-print mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          to={`/print/appointments/${appointment.appointment_id}/confirmation`}
          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
        >
          Print appointment confirmation
        </Link>
        {tests.length > 0 ? (
          <Link
            to={`/print/appointments/${appointment.appointment_id}/tests`}
            className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900"
          >
            Print test results only
          </Link>
        ) : null}
      </div>

      <PrintSection title="Patient and visit" breakAvoid>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Patient</dt>
            <dd className="mt-0.5 font-semibold text-ink">{patient?.name ?? "Not recorded"}</dd>
            <dd className="text-xs text-muted">
              Record #{appointment.patient_id} | {patient?.gender ?? "Gender not recorded"} |{" "}
              {ageFromDob(patient?.date_of_birth) ?? "Unknown"} years
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Blood group</dt>
            <dd className="mt-0.5 text-ink">{patient?.blood_group ?? "Not recorded"}</dd>
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
            <dd className="mt-0.5 text-ink">{formatDate(appointment.appointment_date)}</dd>
            <dd className="text-xs text-muted">
              {formatTime(appointment.appointment_time)} | {appointment.status}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Reason for visit</dt>
            <dd className="mt-0.5 leading-6 text-ink">{appointment.reason_for_visit}</dd>
          </div>
        </dl>
      </PrintSection>

      <PrintSection title="Diagnostic tests">
        {tests.length === 0 ? (
          <p className="text-sm leading-6 text-muted">No diagnostic tests were ordered for this visit.</p>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <div key={test.test_id} className="print-break-avoid border border-line px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink">{test.test_type}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{test.status}</p>
                </div>
                <p className="mt-1 text-xs text-muted">Ordered {formatDateTime(test.order_date)}</p>
                {test.notes ? <p className="mt-2 text-sm leading-6 text-ink">{test.notes}</p> : null}
                {test.result ? (
                  <div className="mt-2 border-l-2 border-brand-300 pl-3">
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
              </div>
            ))}
          </div>
        )}
      </PrintSection>

      <PrintSection title="Diagnosis">
        {diagnosis ? (
          <div className="print-break-avoid">
            <p className="text-sm leading-6 text-ink">{diagnosis.diagnosis_description}</p>
            {diagnosis.notes ? <p className="mt-1 text-sm leading-6 text-muted">{diagnosis.notes}</p> : null}
            <p className="mt-2 text-xs text-muted">Recorded {formatDateTime(diagnosis.diagnosis_date)}</p>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted">No diagnosis has been recorded for this visit.</p>
        )}
      </PrintSection>

      <PrintSection title="Prescription and treatment plan">
        {prescription ? (
          <div className="print-break-avoid">
            <dl className="space-y-3 text-sm leading-6">
              <div>
                <dt className="font-semibold text-ink">Treatment plan</dt>
                <dd className="text-ink">{prescription.treatment_plan}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Patient instructions</dt>
                <dd className="text-ink">{prescription.instructions}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Follow up</dt>
                <dd className="text-ink">{formatFollowUp(prescription.follow_up_date)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted">
            {diagnosis
              ? "No prescription has been recorded for this diagnosis."
              : "A prescription can be recorded after the diagnosis."}
          </p>
        )}
      </PrintSection>

      <PrintFooter note="This clinical record contains private health information. Keep it confidential and share it only with your care team." />
    </div>
  );
}
