import { useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  UserCheck,
  UserX,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage, queryString } from "../../api/client";
import type { DepartmentListResponse, Doctor, DoctorListResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, Input, Select } from "../../components/Form";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { ListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";

interface DoctorForm {
  name: string;
  specialization: string;
  phone: string;
  department_id: string;
  email: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
  account_active: boolean;
}

const emptyForm: DoctorForm = {
  name: "",
  specialization: "",
  phone: "",
  department_id: "",
  email: "",
  password: "",
  confirm_password: "",
  is_active: true,
  account_active: true,
};

export function AdminDoctorsPage() {
  const { push } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [resetDoctor, setResetDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const departmentsState = useApi<DepartmentListResponse>("/departments");
  const state = useApi<DoctorListResponse>(
    `/admin/doctors${queryString({ search, department_id: departmentId || undefined, page, per_page: 10 })}`,
  );
  const doctors = state.data?.doctors ?? [];
  const departments = departmentsState.data?.departments ?? [];

  function refreshList() {
    state.reload();
    departmentsState.reload();
  }

  function openCreate() {
    setForm({ ...emptyForm, department_id: departments[0] ? String(departments[0].department_id) : "" });
    setFieldErrors({});
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(doctor: Doctor) {
    setForm({
      name: doctor.name,
      specialization: doctor.specialization,
      phone: doctor.phone,
      department_id: String(doctor.department_id),
      email: doctor.email ?? "",
      password: "",
      confirm_password: "",
      is_active: doctor.is_active,
      account_active: doctor.account_active ?? true,
    });
    setFieldErrors({});
    setFormError("");
    setEditDoctor(doctor);
  }

  function update(field: keyof DoctorForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateCreate() {
    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) errors.name = "Enter the doctor's full name.";
    if (form.specialization.trim().length < 2) errors.specialization = "Enter a specialization.";
    if (!/^\+?[0-9 ]{7,20}$/.test(form.phone.trim())) errors.phone = "Use 7 to 20 digits, spaces, or a leading plus sign.";
    if (!form.department_id) errors.department_id = "Choose a department.";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) errors.password = "Use at least 8 characters with one letter and one number.";
    if (form.confirm_password !== form.password) errors.confirm_password = "Passwords do not match.";
    return errors;
  }

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateCreate();
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await api.post("/admin/doctors", {
        name: form.name.trim(),
        specialization: form.specialization.trim(),
        phone: form.phone.trim(),
        department_id: Number(form.department_id),
        email: form.email.trim(),
        password: form.password,
      });
      push("Doctor and login account created.", "success");
      setCreateOpen(false);
      setPage(1);
      refreshList();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editDoctor) return;
    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) errors.name = "Enter the doctor's full name.";
    if (form.specialization.trim().length < 2) errors.specialization = "Enter a specialization.";
    if (!/^\+?[0-9 ]{7,20}$/.test(form.phone.trim())) errors.phone = "Use 7 to 20 digits, spaces, or a leading plus sign.";
    if (!form.department_id) errors.department_id = "Choose a department.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await api.patch(`/admin/doctors/${editDoctor.doctor_id}`, {
        name: form.name.trim(),
        specialization: form.specialization.trim(),
        phone: form.phone.trim(),
        department_id: Number(form.department_id),
        is_active: form.is_active,
        account_active: form.account_active,
      });
      push("Doctor details updated.", "success");
      setEditDoctor(null);
      refreshList();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!resetDoctor) return;
    setPasswordError("");
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Use at least 8 characters with one letter and one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post(`/admin/doctors/${resetDoctor.doctor_id}/reset-password`, { new_password: newPassword });
      push("Doctor password reset.", "success");
      setResetDoctor(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(errorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Doctors and clinical accounts"
        description="Add doctors, update department placement, control availability, and reset login access."
        actions={<Button onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Add doctor</Button>}
      />

      <form onSubmit={submitSearch} className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-[1fr_15rem_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <label className="sr-only" htmlFor="admin-doctor-search">Search doctors</label>
          <Input id="admin-doctor-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, specialization, or department" className="pl-10" />
        </div>
        <div>
          <label className="sr-only" htmlFor="admin-doctor-department">Department</label>
          <Select id="admin-doctor-department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department.department_id} value={department.department_id}>{department.department_name}</option>)}
          </Select>
        </div>
        <Button type="submit" icon={<Search className="h-4 w-4" aria-hidden="true" />}>Search</Button>
      </form>

      {state.error ? (
        <div className="mt-5"><Alert variant="error" title="Doctors could not load"><p>{state.error}</p><button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button></Alert></div>
      ) : null}

      <div className="mt-5">
        {state.loading ? (
          <ListSkeleton rows={5} />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="h-5 w-5" />}
            title="No doctors match this search"
            description="Try another search or add a doctor to the hospital team."
            action={<Button variant="secondary" onClick={openCreate}>Add doctor</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Contact</th>
                    <th>Availability</th>
                    <th>Login</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.doctor_id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <DoctorAvatar name={doctor.name} />
                          <div>
                            <p className="font-semibold text-ink">{doctor.name}</p>
                            <p className="mt-0.5 text-xs text-muted">{doctor.specialization}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-sm text-ink">{doctor.department_name}</span></td>
                      <td>
                        <p className="text-sm text-ink">{doctor.phone}</p>
                        <p className="mt-0.5 text-xs text-muted">{doctor.email ?? "No account"}</p>
                      </td>
                      <td><StatusBadge status={doctor.is_active ? "Active" : "Inactive"} /></td>
                      <td><StatusBadge status={doctor.account_active ? "Active" : "Inactive"} /></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(doctor)}
                            className="rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                            aria-label={`Edit ${doctor.name}`}
                            title="Edit doctor"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResetDoctor(doctor); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}
                            className="rounded-lg p-2 text-muted transition hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                            aria-label={`Reset password for ${doctor.name}`}
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              {state.data?.pagination ? <Pagination pagination={state.data.pagination} onPageChange={setPage} label="doctors" /> : null}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => { if (!saving) setCreateOpen(false); }}
        title="Add a doctor"
        description="Creates the doctor record and a linked login account."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="create-doctor-form" loading={saving} icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}>Create doctor</Button>
          </div>
        }
      >
        <form id="create-doctor-form" onSubmit={submitCreate} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Doctor could not be created">{formError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="new-doctor-name" error={fieldErrors.name} required>
              <Input id="new-doctor-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Dr. Full Name" invalid={Boolean(fieldErrors.name)} />
            </Field>
            <Field label="Specialization" htmlFor="new-doctor-specialization" error={fieldErrors.specialization} required>
              <Input id="new-doctor-specialization" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} invalid={Boolean(fieldErrors.specialization)} />
            </Field>
            <Field label="Phone number" htmlFor="new-doctor-phone" error={fieldErrors.phone} required>
              <Input id="new-doctor-phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 98765 43216" invalid={Boolean(fieldErrors.phone)} />
            </Field>
            <Field label="Department" htmlFor="new-doctor-department" error={fieldErrors.department_id} required>
              <Select id="new-doctor-department" value={form.department_id} onChange={(event) => update("department_id", event.target.value)} invalid={Boolean(fieldErrors.department_id)}>
                <option value="">Choose a department</option>
                {departments.map((department) => <option key={department.department_id} value={department.department_id}>{department.department_name}</option>)}
              </Select>
            </Field>
            <Field label="Login email" htmlFor="new-doctor-email" error={fieldErrors.email} required>
              <Input id="new-doctor-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} invalid={Boolean(fieldErrors.email)} />
            </Field>
            <Field label="Temporary password" htmlFor="new-doctor-password" error={fieldErrors.password} hint="At least 8 characters with one letter and one number." required>
              <Input id="new-doctor-password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} invalid={Boolean(fieldErrors.password)} />
            </Field>
            <Field label="Confirm password" htmlFor="new-doctor-confirm" error={fieldErrors.confirm_password} className="sm:col-span-2" required>
              <Input id="new-doctor-confirm" type="password" value={form.confirm_password} onChange={(event) => update("confirm_password", event.target.value)} invalid={Boolean(fieldErrors.confirm_password)} />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editDoctor)}
        onClose={() => { if (!saving) setEditDoctor(null); }}
        title="Edit doctor"
        description={editDoctor ? `${editDoctor.name} | ${editDoctor.email ?? "No login account"}` : undefined}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditDoctor(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="edit-doctor-form" loading={saving}>Save changes</Button>
          </div>
        }
      >
        <form id="edit-doctor-form" onSubmit={submitEdit} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Doctor could not be updated">{formError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="edit-doctor-name" error={fieldErrors.name} required>
              <Input id="edit-doctor-name" value={form.name} onChange={(event) => update("name", event.target.value)} invalid={Boolean(fieldErrors.name)} />
            </Field>
            <Field label="Specialization" htmlFor="edit-doctor-specialization" error={fieldErrors.specialization} required>
              <Input id="edit-doctor-specialization" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} invalid={Boolean(fieldErrors.specialization)} />
            </Field>
            <Field label="Phone number" htmlFor="edit-doctor-phone" error={fieldErrors.phone} required>
              <Input id="edit-doctor-phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} invalid={Boolean(fieldErrors.phone)} />
            </Field>
            <Field label="Department" htmlFor="edit-doctor-department" error={fieldErrors.department_id} required>
              <Select id="edit-doctor-department" value={form.department_id} onChange={(event) => update("department_id", event.target.value)} invalid={Boolean(fieldErrors.department_id)}>
                {departments.map((department) => <option key={department.department_id} value={department.department_id}>{department.department_name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="space-y-2 rounded-xl border border-line p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="mt-1 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-300" />
              <span>
                <span className="block text-sm font-semibold text-ink">Available for new appointments</span>
                <span className="block text-xs text-muted">Inactive doctors are hidden from the public directory and cannot be booked.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 border-t border-line pt-3">
              <input type="checkbox" checked={form.account_active} onChange={(event) => update("account_active", event.target.checked)} className="mt-1 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-300" />
              <span>
                <span className="block text-sm font-semibold text-ink">Login account active</span>
                <span className="block text-xs text-muted">Inactive accounts cannot sign in to the doctor workspace.</span>
              </span>
            </label>
          </div>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted"><UserX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Changing availability does not cancel existing appointments.</p>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetDoctor)}
        onClose={() => { if (!passwordSaving) setResetDoctor(null); }}
        title="Reset doctor password"
        description={resetDoctor ? `Set a new password for ${resetDoctor.name}.` : undefined}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setResetDoctor(null)} disabled={passwordSaving}>Cancel</Button>
            <Button type="submit" form="reset-password-form" loading={passwordSaving}>Reset password</Button>
          </div>
        }
      >
        <form id="reset-password-form" onSubmit={submitPassword} noValidate className="space-y-4">
          {passwordError ? <Alert variant="error" title="Password could not be reset">{passwordError}</Alert> : null}
          <Field label="New password" htmlFor="reset-password" required hint="At least 8 characters with one letter and one number.">
            <Input id="reset-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" htmlFor="reset-password-confirm" required>
            <Input id="reset-password-confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
