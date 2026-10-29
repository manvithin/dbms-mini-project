import { CalendarDays, FileText, FlaskConical, Pill, Printer } from "lucide-react";
import type { Appointment } from "../types";
import { formatDate, formatDateTime, formatFollowUp, formatTime } from "../utils/format";
import { LinkButton } from "./Button";
import { SectionCard } from "./Card";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

export function ClinicalRecord({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) {
  const diagnosis = appointment.diagnosis;
  const prescription = diagnosis?.prescription;
  const tests = appointment.tests ?? [];

  if (!diagnosis && tests.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="No clinical record yet"
        description="Tests, diagnosis, and treatment notes will appear here after the consultation."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
            {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
          </span>
          <StatusBadge status={appointment.status} />
        </div>
        {!compact ? (
          <LinkButton
            to={`/print/appointments/${appointment.appointment_id}/record`}
            variant="secondary"
            size="sm"
            icon={<Printer className="h-4 w-4" aria-hidden="true" />}
          >
            Print record
          </LinkButton>
        ) : null}
      </div>

      {tests.length > 0 ? (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <FlaskConical className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Diagnostic tests
          </h3>
          <div className="space-y-3">
            {tests.map((test) => (
              <div key={test.test_id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{test.test_type}</p>
                  <StatusBadge status={test.status} />
                </div>
                {test.notes ? <p className="mt-2 text-sm leading-6 text-muted">{test.notes}</p> : null}
                {test.result ? (
                  <div className="mt-3 rounded-lg bg-brand-50/70 px-3 py-3 text-sm leading-6 text-brand-900">
                    <p className="font-semibold">Result</p>
                    <p className="mt-1">{test.result.result_summary}</p>
                    {test.result.remarks ? <p className="mt-1 text-brand-800">{test.result.remarks}</p> : null}
                    <p className="mt-2 text-xs text-brand-700">Recorded {formatDateTime(test.result.result_date)}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">The result is not available yet.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {diagnosis ? (
        <div className="rounded-xl border border-line p-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <FileText className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Diagnosis
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink">{diagnosis.diagnosis_description}</p>
          {diagnosis.notes ? <p className="mt-1 text-sm leading-6 text-muted">{diagnosis.notes}</p> : null}
          <p className="mt-2 text-xs text-muted">Recorded {formatDateTime(diagnosis.diagnosis_date)}</p>
        </div>
      ) : null}

      {prescription ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Pill className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Treatment plan and prescription
          </h3>
          <dl className="mt-3 space-y-3 text-sm leading-6">
            <div>
              <dt className="font-semibold text-ink">Treatment plan</dt>
              <dd className="text-muted">{prescription.treatment_plan}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Patient instructions</dt>
              <dd className="text-muted">{prescription.instructions}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Follow up</dt>
              <dd className="text-muted">{formatFollowUp(prescription.follow_up_date)}</dd>
            </div>
          </dl>
        </div>
      ) : diagnosis ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted">
          The treatment plan and prescription have not been recorded yet.
        </div>
      ) : null}
    </div>
  );
}

export function AppointmentRecordCard({ appointment }: { appointment: Appointment }) {
  return (
    <SectionCard
      title={`Visit on ${formatDate(appointment.appointment_date)}`}
      description={`${appointment.doctor?.name ?? "Doctor"} | ${appointment.doctor?.department_name ?? "Department"}`}
      action={<LinkButton to={`/patient/appointments/${appointment.appointment_id}`} variant="secondary" size="sm">Open visit</LinkButton>}
    >
      <ClinicalRecord appointment={appointment} />
    </SectionCard>
  );
}
