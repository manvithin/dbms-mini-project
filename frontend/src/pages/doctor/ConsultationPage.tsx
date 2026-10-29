import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ClipboardList,
  Clock3,
  FileHeart,
  FlaskConical,
  HeartPulse,
  Phone,
  Pill,
  Printer,
  Stethoscope,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage } from "../../api/client";
import type { AppointmentDetailResponse, TestOrder } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Avatar } from "../../components/Avatar";
import { Button, LinkButton } from "../../components/Button";
import { SectionCard } from "../../components/Card";
import { Field, Input, Select, Textarea } from "../../components/Form";
import { ConfirmDialog, Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { PageLoading } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { StatusTimeline } from "../../components/StatusTimeline";
import {
  ageFromDob,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatFollowUp,
  formatTime,
  todayISO,
} from "../../utils/format";

const destructiveStatuses = ["Cancelled", "No Show"];

export function ConsultationPage() {
  const { appointmentId } = useParams();
  const { push } = useToast();
  const state = useApi<AppointmentDetailResponse>(appointmentId ? `/doctor/appointments/${appointmentId}` : null);

  const [nextStatus, setNextStatus] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);

  const [testType, setTestType] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [testError, setTestError] = useState("");
  const [testFields, setTestFields] = useState<Record<string, string>>({});
  const [testSaving, setTestSaving] = useState(false);

  const [resultTest, setResultTest] = useState<TestOrder | null>(null);
  const [resultSummary, setResultSummary] = useState("");
  const [resultRemarks, setResultRemarks] = useState("");
  const [resultError, setResultError] = useState("");
  const [resultFields, setResultFields] = useState<Record<string, string>>({});
  const [resultSaving, setResultSaving] = useState(false);

  const [diagnosisText, setDiagnosisText] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [diagnosisError, setDiagnosisError] = useState("");
  const [diagnosisFields, setDiagnosisFields] = useState<Record<string, string>>({});
  const [diagnosisSaving, setDiagnosisSaving] = useState(false);

  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [instructions, setInstructions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [prescriptionError, setPrescriptionError] = useState("");
  const [prescriptionFields, setPrescriptionFields] = useState<Record<string, string>>({});
  const [prescriptionSaving, setPrescriptionSaving] = useState(false);

  if (state.loading) return <PageLoading label="Loading consultation" />;
  if (state.error || !state.data) {
    return (
      <Alert variant="error" title="Consultation could not load">
        <p>{state.error ?? "The appointment was not found or is not assigned to you."}</p>
        <div className="mt-3 flex gap-3">
          <Button variant="secondary" size="sm" onClick={state.reload}>Try again</Button>
          <LinkButton to="/doctor/appointments" variant="ghost" size="sm">Back to appointments</LinkButton>
        </div>
      </Alert>
    );
  }

  const appointment = state.data.appointment;
  const patient = appointment.patient;
  const permissions = appointment.permissions;
  const allowedStatuses = permissions?.allowed_statuses ?? [];
  const canManage = permissions?.can_manage_clinical ?? false;
  const diagnosis = appointment.diagnosis;
  const prescription = diagnosis?.prescription;
  const tests = appointment.tests ?? [];

  async function updateStatus() {
    if (!nextStatus) return;
    setStatusSaving(true);
    setStatusError("");
    try {
      await api.patch(`/doctor/appointments/${appointment.appointment_id}/status`, { status: nextStatus });
      push(`Appointment status updated to ${nextStatus}.`, "success");
      setNextStatus("");
      setConfirmStatus(false);
      state.reload();
    } catch (error) {
      setStatusError(errorMessage(error));
    } finally {
      setStatusSaving(false);
    }
  }

  function requestStatusUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!nextStatus) return;
    if (destructiveStatuses.includes(nextStatus)) {
      setConfirmStatus(true);
      return;
    }
    void updateStatus();
  }

  async function submitTest(event: React.FormEvent) {
    event.preventDefault();
    setTestError("");
    setTestFields({});
    if (!testType.trim()) {
      setTestFields({ test_type: "Enter the test type." });
      return;
    }
    setTestSaving(true);
    try {
      await api.post(`/appointments/${appointment.appointment_id}/tests`, { test_type: testType.trim(), notes: testNotes.trim() || undefined });
      push("Test ordered.", "success");
      setTestType("");
      setTestNotes("");
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setTestFields(error.fields);
      setTestError(errorMessage(error));
    } finally {
      setTestSaving(false);
    }
  }

  function openResult(test: TestOrder) {
    setResultTest(test);
    setResultSummary("");
    setResultRemarks("");
    setResultError("");
    setResultFields({});
  }

  async function submitResult(event: React.FormEvent) {
    event.preventDefault();
    if (!resultTest) return;
    setResultError("");
    setResultFields({});
    if (!resultSummary.trim()) {
      setResultFields({ result_summary: "Enter the result summary." });
      return;
    }
    setResultSaving(true);
    try {
      await api.post(`/tests/${resultTest.test_id}/result`, {
        result_summary: resultSummary.trim(),
        remarks: resultRemarks.trim() || undefined,
      });
      push("Test result recorded.", "success");
      setResultTest(null);
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setResultFields(error.fields);
      setResultError(errorMessage(error));
    } finally {
      setResultSaving(false);
    }
  }

  async function submitDiagnosis(event: React.FormEvent) {
    event.preventDefault();
    setDiagnosisError("");
    setDiagnosisFields({});
    if (!diagnosisText.trim()) {
      setDiagnosisFields({ diagnosis_description: "Enter the diagnosis description." });
      return;
    }
    setDiagnosisSaving(true);
    try {
      await api.post(`/appointments/${appointment.appointment_id}/diagnosis`, {
        diagnosis_description: diagnosisText.trim(),
        notes: diagnosisNotes.trim() || undefined,
      });
      push("Diagnosis recorded.", "success");
      setDiagnosisText("");
      setDiagnosisNotes("");
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setDiagnosisFields(error.fields);
      setDiagnosisError(errorMessage(error));
    } finally {
      setDiagnosisSaving(false);
    }
  }

  async function submitPrescription(event: React.FormEvent) {
    event.preventDefault();
    if (!diagnosis) return;
    setPrescriptionError("");
    setPrescriptionFields({});
    const errors: Record<string, string> = {};
    if (!treatmentPlan.trim()) errors.treatment_plan = "Enter the treatment plan.";
    if (!instructions.trim()) errors.instructions = "Enter the patient instructions.";
    if (followUpDate && followUpDate < todayISO()) errors.follow_up_date = "Follow up date cannot be in the past.";
    setPrescriptionFields(errors);
    if (Object.keys(errors).length > 0) return;

    setPrescriptionSaving(true);
    try {
      await api.post(`/diagnoses/${diagnosis.diagnosis_id}/prescription`, {
        treatment_plan: treatmentPlan.trim(),
        instructions: instructions.trim(),
        follow_up_date: followUpDate || undefined,
      });
      push("Prescription and treatment plan recorded.", "success");
      setTreatmentPlan("");
      setInstructions("");
      setFollowUpDate("");
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setPrescriptionFields(error.fields);
      setPrescriptionError(errorMessage(error));
    } finally {
      setPrescriptionSaving(false);
    }
  }

  return (
    <div>
      <Link to="/doctor/appointments" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to appointment list
      </Link>
      <PageHeader
        showBack={false}
        eyebrow={`Appointment #${appointment.appointment_id}`}
        title={patient?.name ?? "Patient consultation"}
        description={`${formatDateLong(appointment.appointment_date)} at ${formatTime(appointment.appointment_time)} | ${appointment.doctor?.department_name ?? "Outpatient"}`}
        actions={
          <>
            <StatusBadge status={appointment.status} />
            <LinkButton to={`/print/appointments/${appointment.appointment_id}/record`} variant="secondary" icon={<Printer className="h-4 w-4" aria-hidden="true" />}>
              Print record
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.32fr_0.68fr]">
        <div className="space-y-6">
          <SectionCard title="Patient summary" description="Details from the patient record and the reason for this visit.">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={patient?.name ?? "Patient"} size="xl" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-semibold text-ink">{patient?.name ?? "Patient"}</h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span>{patient?.gender ?? "Not recorded"}</span>
                  <span>{patient ? `${ageFromDob(patient.date_of_birth) ?? "Unknown"} years` : "Age not recorded"}</span>
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{patient?.phone ?? "Not recorded"}</span>
                  <span>Blood group {patient?.blood_group ?? "Unknown"}</span>
                </div>
                <p className="mt-2 text-xs text-muted">Date of birth {formatDate(patient?.date_of_birth)}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reason for visit</p>
                <p className="mt-1 text-sm leading-6 text-ink">{appointment.reason_for_visit}</p>
              </div>
              <div className="rounded-xl border border-line bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Medical history</p>
                <p className="mt-1 text-sm leading-6 text-ink">{patient?.medical_history ?? "No medical history recorded."}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Diagnostic tests"
            description="Tests are optional. A diagnosis and prescription can be recorded without ordering any test."
          >
            {tests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-muted">No tests have been ordered for this visit.</p>
            ) : (
              <div className="space-y-3">
                {tests.map((test) => (
                  <div key={test.test_id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink">{test.test_type}</p>
                        <p className="mt-0.5 text-xs text-muted">Ordered {formatDateTime(test.order_date)}</p>
                      </div>
                      <StatusBadge status={test.status} />
                    </div>
                    {test.notes ? <p className="mt-2 text-sm leading-6 text-muted">{test.notes}</p> : null}
                    {test.result ? (
                      <div className="mt-3 rounded-lg bg-brand-50/70 p-3 text-sm leading-6 text-brand-900">
                        <p className="font-semibold">Result</p>
                        <p className="mt-1">{test.result.result_summary}</p>
                        {test.result.remarks ? <p className="mt-1 text-brand-800">{test.result.remarks}</p> : null}
                        <p className="mt-1 text-xs text-brand-700">Recorded {formatDateTime(test.result.result_date)}</p>
                      </div>
                    ) : canManage && test.status !== "Cancelled" ? (
                      <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => openResult(test)}>
                        Record result
                      </Button>
                    ) : (
                      <p className="mt-2 text-xs text-muted">No result recorded yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canManage ? (
              <form onSubmit={submitTest} noValidate className="mt-5 border-t border-line pt-5">
                <h3 className="font-display text-lg font-semibold text-ink">Order a test</h3>
                {testError ? <div className="mt-3"><Alert variant="error" title="Test could not be ordered">{testError}</Alert></div> : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                  <Field label="Test type" htmlFor="test-type" error={testFields.test_type} required>
                    <Input id="test-type" value={testType} onChange={(event) => setTestType(event.target.value)} placeholder="For example: Chest X ray" invalid={Boolean(testFields.test_type)} />
                  </Field>
                  <Field label="Notes" htmlFor="test-notes" error={testFields.notes}>
                    <Input id="test-notes" value={testNotes} onChange={(event) => setTestNotes(event.target.value)} placeholder="Optional clinical note" />
                  </Field>
                  <Button type="submit" loading={testSaving} icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}>Order test</Button>
                </div>
              </form>
            ) : (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                Check the patient in before ordering tests or recording clinical notes.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Diagnosis" description="Record the clinical assessment. Tests are not required to save a diagnosis.">
            {diagnosis ? (
              <div className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{diagnosis.diagnosis_description}</p>
                    <p className="mt-1 text-xs text-muted">Recorded {formatDateTime(diagnosis.diagnosis_date)}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Recorded</span>
                </div>
                {diagnosis.notes ? <p className="mt-3 text-sm leading-6 text-muted">{diagnosis.notes}</p> : null}
              </div>
            ) : canManage ? (
              <form onSubmit={submitDiagnosis} noValidate>
                {diagnosisError ? <div className="mb-3"><Alert variant="error" title="Diagnosis could not be recorded">{diagnosisError}</Alert></div> : null}
                <Field label="Diagnosis description" htmlFor="diagnosis-text" error={diagnosisFields.diagnosis_description} required>
                  <Textarea id="diagnosis-text" value={diagnosisText} onChange={(event) => setDiagnosisText(event.target.value)} placeholder="Describe the clinical assessment" invalid={Boolean(diagnosisFields.diagnosis_description)} />
                </Field>
                <Field label="Clinical notes" htmlFor="diagnosis-notes" error={diagnosisFields.notes} className="mt-3">
                  <Textarea id="diagnosis-notes" value={diagnosisNotes} onChange={(event) => setDiagnosisNotes(event.target.value)} placeholder="Optional supporting notes" className="min-h-[80px]" />
                </Field>
                <Button type="submit" className="mt-3" loading={diagnosisSaving} icon={<Activity className="h-4 w-4" aria-hidden="true" />}>Record diagnosis</Button>
              </form>
            ) : (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">A diagnosis can be recorded after the patient is checked in.</p>
            )}
          </SectionCard>

          <SectionCard title="Treatment plan and prescription" description="Store medicine details and care advice as text, with an optional follow up date.">
            {prescription ? (
              <dl className="space-y-4 text-sm leading-6">
                <div className="rounded-xl border border-line p-4">
                  <dt className="flex items-center gap-2 font-semibold text-ink"><Pill className="h-4 w-4 text-brand-700" aria-hidden="true" />Treatment plan</dt>
                  <dd className="mt-1 text-muted">{prescription.treatment_plan}</dd>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <dt className="font-semibold text-ink">Patient instructions</dt>
                  <dd className="mt-1 text-muted">{prescription.instructions}</dd>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <dt className="font-semibold text-ink">Follow up</dt>
                  <dd className="mt-1 text-muted">{formatFollowUp(prescription.follow_up_date)}</dd>
                </div>
              </dl>
            ) : !diagnosis ? (
              <p className="rounded-xl border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-muted">Record a diagnosis first. The prescription must be linked to this appointment diagnosis.</p>
            ) : canManage ? (
              <form onSubmit={submitPrescription} noValidate>
                {prescriptionError ? <div className="mb-3"><Alert variant="error" title="Prescription could not be recorded">{prescriptionError}</Alert></div> : null}
                <Field label="Treatment plan" htmlFor="prescription-plan" error={prescriptionFields.treatment_plan} required hint="Include medicine names, doses, and duration as text.">
                  <Textarea id="prescription-plan" value={treatmentPlan} onChange={(event) => setTreatmentPlan(event.target.value)} placeholder="Example: Rest and fluids for five days. Paracetamol 500 mg as needed." invalid={Boolean(prescriptionFields.treatment_plan)} />
                </Field>
                <Field label="Patient instructions" htmlFor="prescription-instructions" error={prescriptionFields.instructions} required className="mt-3">
                  <Textarea id="prescription-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="When to take medicine, warning signs, and when to return" invalid={Boolean(prescriptionFields.instructions)} />
                </Field>
                <div className="mt-3 max-w-xs">
                  <Field label="Follow up date" htmlFor="prescription-follow-up" error={prescriptionFields.follow_up_date} hint="Optional.">
                    <Input id="prescription-follow-up" type="date" min={todayISO()} value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} invalid={Boolean(prescriptionFields.follow_up_date)} />
                  </Field>
                </div>
                <Button type="submit" className="mt-3" loading={prescriptionSaving} icon={<FileHeart className="h-4 w-4" aria-hidden="true" />}>Record prescription</Button>
              </form>
            ) : (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">A prescription can be recorded after the patient is checked in.</p>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <SectionCard title="Visit status" description="Move the appointment through the clinic workflow.">
            {statusError ? <div className="mb-3"><Alert variant="error" title="Status could not be updated">{statusError}</Alert></div> : null}
            <div className="flex items-center gap-3 rounded-xl border border-line bg-slate-50 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current status</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{appointment.status}</p>
              </div>
            </div>
            {allowedStatuses.length > 0 ? (
              <form onSubmit={requestStatusUpdate} className="mt-4 space-y-3">
                <Field label="New status" htmlFor="next-status">
                  <Select id="next-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                    <option value="">Choose a status</option>
                    {allowedStatuses.map((status) => <option key={status}>{status}</option>)}
                  </Select>
                </Field>
                <Button type="submit" className="w-full" loading={statusSaving} disabled={!nextStatus} icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}>Update status</Button>
                {!nextStatus ? <p className="text-center text-[11px] leading-5 text-muted">Choose a status to enable the update.</p> : null}
              </form>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-muted">This appointment has reached a final status and cannot move further.</p>
            )}
          </SectionCard>

          <SectionCard title="Visit timeline" description="Every status change is recorded by the database trigger.">
            <StatusTimeline history={appointment.status_history ?? []} />
          </SectionCard>

          <div className="rounded-xl2 border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-brand-700" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-ink">Appointment details</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Date</dt><dd className="text-right font-semibold text-ink">{formatDate(appointment.appointment_date)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Time</dt><dd className="text-right font-semibold text-ink">{formatTime(appointment.appointment_time)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Department</dt><dd className="text-right font-semibold text-ink">{appointment.doctor?.department_name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Patient ID</dt><dd className="text-right font-semibold text-ink">#{appointment.patient_id}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl2 border border-brand-200 bg-brand-50 p-5">
            <div className="flex items-center gap-2 text-brand-800">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-semibold">Clinical reminder</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-brand-900">Diagnosis and prescription do not depend on test results. Record tests only when they add useful evidence.</p>
          </div>
        </aside>
      </div>

      <Modal
        open={Boolean(resultTest)}
        onClose={() => { if (!resultSaving) setResultTest(null); }}
        title="Record test result"
        description={resultTest ? `${resultTest.test_type} for ${patient?.name ?? "this patient"}` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setResultTest(null)} disabled={resultSaving}>Cancel</Button>
            <Button type="submit" form="test-result-form" loading={resultSaving}>Save result</Button>
          </div>
        }
      >
        <form id="test-result-form" onSubmit={submitResult} noValidate className="space-y-4">
          {resultError ? <Alert variant="error" title="Result could not be saved">{resultError}</Alert> : null}
          <Field label="Result summary" htmlFor="result-summary" error={resultFields.result_summary} required hint="Describe the evidence. A result is not a diagnosis.">
            <Textarea id="result-summary" value={resultSummary} onChange={(event) => setResultSummary(event.target.value)} placeholder="Example: Chest X ray shows clear lung fields." invalid={Boolean(resultFields.result_summary)} />
          </Field>
          <Field label="Remarks" htmlFor="result-remarks" error={resultFields.remarks}>
            <Textarea id="result-remarks" value={resultRemarks} onChange={(event) => setResultRemarks(event.target.value)} placeholder="Optional laboratory or reviewer remark" className="min-h-[80px]" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmStatus}
        onClose={() => { if (!statusSaving) setConfirmStatus(false); }}
        onConfirm={updateStatus}
        title={`Mark appointment as ${nextStatus}?`}
        description="This changes the appointment state immediately and is recorded in the status timeline."
        confirmLabel={`Mark as ${nextStatus || "updated"}`}
        loading={statusSaving}
      />
    </div>
  );
}
