import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage, queryString } from "../../api/client";
import type { DoctorListResponse, Schedule, ScheduleListResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, Input, Select } from "../../components/Form";
import { ConfirmDialog, Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { dayNames, formatTimeRange } from "../../utils/format";

interface ScheduleForm {
  doctor_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: string;
  is_active: boolean;
}

const emptyForm: ScheduleForm = {
  doctor_id: "",
  day_of_week: "0",
  start_time: "09:00",
  end_time: "13:00",
  slot_duration_minutes: "30",
  is_active: true,
};

export function AdminSchedulesPage() {
  const { push } = useToast();
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doctorsState = useApi<DoctorListResponse>("/admin/doctors?per_page=50");
  const state = useApi<ScheduleListResponse>(
    `/admin/schedules${queryString({ doctor_id: doctorFilter || undefined, day_of_week: dayFilter || undefined })}`,
  );
  const doctors = doctorsState.data?.doctors ?? [];
  const schedules = state.data?.schedules ?? [];

  function refresh() {
    state.reload();
    doctorsState.reload();
  }

  function openCreate() {
    setForm({ ...emptyForm, doctor_id: doctors[0] ? String(doctors[0].doctor_id) : "" });
    setFieldErrors({});
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(schedule: Schedule) {
    setForm({
      doctor_id: String(schedule.doctor_id),
      day_of_week: String(schedule.day_of_week),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      slot_duration_minutes: String(schedule.slot_duration_minutes),
      is_active: schedule.is_active,
    });
    setFieldErrors({});
    setFormError("");
    setEditSchedule(schedule);
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.doctor_id) errors.doctor_id = "Choose a doctor.";
    if (!form.start_time) errors.start_time = "Choose a start time.";
    if (!form.end_time) errors.end_time = "Choose an end time.";
    if (form.start_time && form.end_time && form.end_time <= form.start_time) errors.end_time = "End time must be after start time.";
    const duration = Number(form.slot_duration_minutes);
    if (!duration || duration < 5 || duration > 240) errors.slot_duration_minutes = "Slot duration must be between 5 and 240 minutes.";
    return errors;
  }

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await api.post("/admin/schedules", {
        doctor_id: Number(form.doctor_id),
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        slot_duration_minutes: Number(form.slot_duration_minutes),
        is_active: form.is_active,
      });
      push("Clinic schedule created.", "success");
      setCreateOpen(false);
      refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editSchedule) return;
    const errors = validate();
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await api.patch(`/admin/schedules/${editSchedule.schedule_id}`, {
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        slot_duration_minutes: Number(form.slot_duration_minutes),
        is_active: form.is_active,
      });
      push("Clinic schedule updated.", "success");
      setEditSchedule(null);
      refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteSchedule) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/schedules/${deleteSchedule.schedule_id}`);
      push("Clinic schedule deleted.", "success");
      setDeleteSchedule(null);
      refresh();
    } catch (error) {
      setFormError(errorMessage(error));
      setDeleteSchedule(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Clinic schedules"
        description="Clinic hours decide which appointment slots patients can see and book."
        actions={<Button onClick={openCreate} disabled={doctors.length === 0} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Add schedule</Button>}
      />

      <div className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="schedule-doctor-filter" className="mb-1 block text-xs font-semibold text-muted">Doctor</label>
          <Select id="schedule-doctor-filter" value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
            <option value="">All doctors</option>
            {doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="schedule-day-filter" className="mb-1 block text-xs font-semibold text-muted">Day</label>
          <Select id="schedule-day-filter" value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}>
            <option value="">All days</option>
            {dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={() => { setDoctorFilter(""); setDayFilter(""); }} disabled={!doctorFilter && !dayFilter}>Clear filters</Button>
        </div>
      </div>
      {doctors.length === 0 && !doctorsState.loading ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Add a doctor before creating a clinic schedule.</p>
      ) : null}

      {state.error ? (
        <div className="mt-5"><Alert variant="error" title="Schedules could not load"><p>{state.error}</p><button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button></Alert></div>
      ) : null}

      <div className="mt-5">
        {state.loading ? (
          <ListSkeleton rows={4} />
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={<Clock3 className="h-5 w-5" />}
            title="No clinic schedules match this view"
            description="Create weekly clinic hours so patients can book available slots."
            action={<Button onClick={openCreate} disabled={doctors.length === 0}>Add schedule</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Day</th>
                    <th>Clinic hours</th>
                    <th>Slot length</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.schedule_id}>
                      <td>
                        <p className="font-semibold text-ink">{schedule.doctor_name}</p>
                        <p className="mt-0.5 text-xs text-muted">{schedule.department_name}</p>
                      </td>
                      <td><span className="font-medium text-ink">{schedule.day_name}</span></td>
                      <td><span className="text-sm text-ink">{formatTimeRange(schedule.start_time, schedule.end_time)}</span></td>
                      <td><span className="text-sm text-muted">{schedule.slot_duration_minutes} minutes</span></td>
                      <td><StatusBadge status={schedule.is_active ? "Active" : "Inactive"} /></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(schedule)} className="rounded-lg p-2 text-muted hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300" aria-label={`Edit schedule for ${schedule.doctor_name}`} title="Edit schedule">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => { setFormError(""); setDeleteSchedule(schedule); }} className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200" aria-label={`Delete schedule for ${schedule.doctor_name}`} title="Delete schedule">
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
        title="Add clinic schedule"
        description="Set a weekly session. Active schedules must not overlap for the same doctor."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="create-schedule-form" loading={saving}>Create schedule</Button>
          </div>
        }
      >
        <form id="create-schedule-form" onSubmit={submitCreate} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Schedule could not be created">{formError}</Alert> : null}
          <ScheduleFields form={form} setForm={setForm} fieldErrors={fieldErrors} doctors={doctors} allowDoctor />
        </form>
      </Modal>

      <Modal
        open={Boolean(editSchedule)}
        onClose={() => { if (!saving) setEditSchedule(null); }}
        title="Edit clinic schedule"
        description={editSchedule ? `${editSchedule.doctor_name} | ${editSchedule.day_name}` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditSchedule(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="edit-schedule-form" loading={saving}>Save changes</Button>
          </div>
        }
      >
        <form id="edit-schedule-form" onSubmit={submitEdit} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Schedule could not be updated">{formError}</Alert> : null}
          <ScheduleFields form={form} setForm={setForm} fieldErrors={fieldErrors} doctors={doctors} allowDoctor={false} />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteSchedule)}
        onClose={() => { if (!deleting) setDeleteSchedule(null); }}
        onConfirm={confirmDelete}
        title="Delete this clinic schedule?"
        description={deleteSchedule ? `${deleteSchedule.day_name}, ${formatTimeRange(deleteSchedule.start_time, deleteSchedule.end_time)} with ${deleteSchedule.doctor_name}.` : ""}
        confirmLabel="Delete schedule"
        loading={deleting}
      />
    </div>
  );
}

function ScheduleFields({
  form,
  setForm,
  fieldErrors,
  doctors,
  allowDoctor,
}: {
  form: ScheduleForm;
  setForm: Dispatch<SetStateAction<ScheduleForm>>;
  fieldErrors: Record<string, string>;
  doctors: { doctor_id: number; name: string; department_name: string | null }[];
  allowDoctor: boolean;
}) {
  function update(field: keyof ScheduleForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  return (
    <>
      <Field label="Doctor" htmlFor="schedule-doctor" error={fieldErrors.doctor_id} required>
        <Select id="schedule-doctor" value={form.doctor_id} onChange={(event) => update("doctor_id", event.target.value)} disabled={!allowDoctor} invalid={Boolean(fieldErrors.doctor_id)}>
          <option value="">Choose a doctor</option>
          {doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.name} | {doctor.department_name}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Day of week" htmlFor="schedule-day" error={fieldErrors.day_of_week} required>
          <Select id="schedule-day" value={form.day_of_week} onChange={(event) => update("day_of_week", event.target.value)}>
            {dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </Select>
        </Field>
        <Field label="Slot duration" htmlFor="schedule-duration" error={fieldErrors.slot_duration_minutes} required hint="Between 5 and 240 minutes.">
          <Input id="schedule-duration" type="number" min={5} max={240} value={form.slot_duration_minutes} onChange={(event) => update("slot_duration_minutes", event.target.value)} invalid={Boolean(fieldErrors.slot_duration_minutes)} />
        </Field>
        <Field label="Start time" htmlFor="schedule-start" error={fieldErrors.start_time} required>
          <Input id="schedule-start" type="time" value={form.start_time} onChange={(event) => update("start_time", event.target.value)} invalid={Boolean(fieldErrors.start_time)} />
        </Field>
        <Field label="End time" htmlFor="schedule-end" error={fieldErrors.end_time} required>
          <Input id="schedule-end" type="time" value={form.end_time} onChange={(event) => update("end_time", event.target.value)} invalid={Boolean(fieldErrors.end_time)} />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-line p-4">
        <input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="mt-1 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-300" />
        <span>
          <span className="block text-sm font-semibold text-ink">Schedule is active</span>
          <span className="block text-xs text-muted">Inactive schedules do not offer appointment slots.</span>
        </span>
      </label>
    </>
  );
}
