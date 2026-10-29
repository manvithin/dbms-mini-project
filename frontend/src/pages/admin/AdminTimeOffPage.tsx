import { useState } from "react";
import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage, queryString } from "../../api/client";
import type { DoctorListResponse, TimeOff, TimeOffListResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, Input, Select, Textarea } from "../../components/Form";
import { ConfirmDialog, Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ListSkeleton } from "../../components/Skeleton";
import { formatDateTimeLocal } from "../../utils/format";

interface TimeOffForm {
  doctor_id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string;
}

function defaultStart() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T09:00`;
}

function defaultEnd() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(12, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T12:00`;
}

export function AdminTimeOffPage() {
  const { push } = useToast();
  const [doctorFilter, setDoctorFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<TimeOff | null>(null);
  const [form, setForm] = useState<TimeOffForm>({ doctor_id: "", start_datetime: defaultStart(), end_datetime: defaultEnd(), reason: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doctorsState = useApi<DoctorListResponse>("/admin/doctors?per_page=50");
  const state = useApi<TimeOffListResponse>(`/admin/time-off${queryString({ doctor_id: doctorFilter || undefined })}`);
  const doctors = doctorsState.data?.doctors ?? [];
  const entries = state.data?.time_off ?? [];

  function openCreate() {
    setForm({ doctor_id: doctors[0] ? String(doctors[0].doctor_id) : "", start_datetime: defaultStart(), end_datetime: defaultEnd(), reason: "" });
    setFieldErrors({});
    setFormError("");
    setCreateOpen(true);
  }

  function update(field: keyof TimeOffForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.doctor_id) errors.doctor_id = "Choose a doctor.";
    if (!form.start_datetime) errors.start_datetime = "Choose a start date and time.";
    if (!form.end_datetime) errors.end_datetime = "Choose an end date and time.";
    if (form.start_datetime && form.end_datetime && form.end_datetime <= form.start_datetime) errors.end_datetime = "End time must be after start time.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await api.post("/admin/time-off", {
        doctor_id: Number(form.doctor_id),
        start_datetime: form.start_datetime,
        end_datetime: form.end_datetime,
        reason: form.reason.trim() || undefined,
      });
      push("Doctor time off added.", "success");
      setCreateOpen(false);
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteEntry) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/time-off/${deleteEntry.time_off_id}`);
      push("Time off removed.", "success");
      setDeleteEntry(null);
      state.reload();
    } catch (error) {
      setFormError(errorMessage(error));
      setDeleteEntry(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Doctor time off"
        description="Block clinic time for meetings, training, or leave. Blocked time is removed from patient availability."
        actions={<Button onClick={openCreate} disabled={doctors.length === 0} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Add time off</Button>}
      />

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="time-off-doctor-filter" className="mb-1 block text-xs font-semibold text-muted">Doctor</label>
          <Select id="time-off-doctor-filter" value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
            <option value="">All doctors</option>
            {doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.name}</option>)}
          </Select>
        </div>
        <Button variant="secondary" onClick={() => setDoctorFilter("")} disabled={!doctorFilter}>Clear filter</Button>
      </div>
      {doctors.length === 0 && !doctorsState.loading ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Add a doctor before recording time off.</p>
      ) : null}

      {state.error ? (
        <div className="mt-5"><Alert variant="error" title="Time off could not load"><p>{state.error}</p><button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button></Alert></div>
      ) : null}

      <div className="mt-5">
        {state.loading ? (
          <ListSkeleton rows={4} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No time off recorded"
            description="When a doctor is unavailable, add the time here so patients do not see those slots."
            action={<Button onClick={openCreate} disabled={doctors.length === 0}>Add time off</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Unavailable from</th>
                    <th>Unavailable until</th>
                    <th>Reason</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.time_off_id}>
                      <td><span className="font-semibold text-ink">{entry.doctor_name}</span></td>
                      <td><span className="text-sm text-ink">{formatDateTimeLocal(entry.start_datetime)}</span></td>
                      <td><span className="text-sm text-ink">{formatDateTimeLocal(entry.end_datetime)}</span></td>
                      <td><span className="text-sm text-muted">{entry.reason ?? "No reason recorded"}</span></td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => { setFormError(""); setDeleteEntry(entry); }}
                            className="rounded-lg p-2 text-muted transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                            aria-label={`Remove time off for ${entry.doctor_name}`}
                            title="Remove time off"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => { if (!saving) setCreateOpen(false); }}
        title="Add doctor time off"
        description="Blocked clinic time is not offered to patients."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="create-time-off-form" loading={saving} icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}>Add time off</Button>
          </div>
        }
      >
        <form id="create-time-off-form" onSubmit={submitCreate} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Time off could not be added">{formError}</Alert> : null}
          <Field label="Doctor" htmlFor="time-off-doctor" error={fieldErrors.doctor_id} required>
            <Select id="time-off-doctor" value={form.doctor_id} onChange={(event) => update("doctor_id", event.target.value)} invalid={Boolean(fieldErrors.doctor_id)}>
              <option value="">Choose a doctor</option>
              {doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.name} | {doctor.department_name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date and time" htmlFor="time-off-start" error={fieldErrors.start_datetime} required>
              <Input id="time-off-start" type="datetime-local" value={form.start_datetime} onChange={(event) => update("start_datetime", event.target.value)} invalid={Boolean(fieldErrors.start_datetime)} />
            </Field>
            <Field label="End date and time" htmlFor="time-off-end" error={fieldErrors.end_datetime} required>
              <Input id="time-off-end" type="datetime-local" value={form.end_datetime} onChange={(event) => update("end_datetime", event.target.value)} invalid={Boolean(fieldErrors.end_datetime)} />
            </Field>
          </div>
          <Field label="Reason" htmlFor="time-off-reason" error={fieldErrors.reason} hint="Optional. Visible to administrators only.">
            <Textarea id="time-off-reason" value={form.reason} onChange={(event) => update("reason", event.target.value)} className="min-h-[80px]" placeholder="For example: hospital committee meeting" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteEntry)}
        onClose={() => { if (!deleting) setDeleteEntry(null); }}
        onConfirm={confirmDelete}
        title="Remove this time off?"
        description={deleteEntry ? `${deleteEntry.doctor_name} from ${formatDateTimeLocal(deleteEntry.start_datetime)} to ${formatDateTimeLocal(deleteEntry.end_datetime)}.` : ""}
        confirmLabel="Remove time off"
        loading={deleting}
      />
    </div>
  );
}
