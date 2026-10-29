import { useState } from "react";
import { HeartPulse, Pencil, Plus, Stethoscope } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage } from "../../api/client";
import type { Department, DepartmentListResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, Input, Textarea } from "../../components/Form";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ListSkeleton } from "../../components/Skeleton";

export function AdminDepartmentsPage() {
  const { push } = useToast();
  const state = useApi<DepartmentListResponse>("/admin/departments");
  const [createOpen, setCreateOpen] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const departments = state.data?.departments ?? [];

  function openCreate() {
    setName("");
    setDescription("");
    setFieldErrors({});
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(department: Department) {
    setName(department.department_name);
    setDescription(department.description ?? "");
    setFieldErrors({});
    setFormError("");
    setEditDepartment(department);
  }

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    if (name.trim().length < 2) {
      setFieldErrors({ department_name: "Enter a department name of at least 2 characters." });
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      await api.post("/admin/departments", { department_name: name.trim(), description: description.trim() || undefined });
      push("Department created.", "success");
      setCreateOpen(false);
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editDepartment) return;
    setFormError("");
    if (name.trim().length < 2) {
      setFieldErrors({ department_name: "Enter a department name of at least 2 characters." });
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      await api.patch(`/admin/departments/${editDepartment.department_id}`, {
        department_name: name.trim(),
        description: description.trim() || undefined,
      });
      push("Department updated.", "success");
      setEditDepartment(null);
      state.reload();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Departments"
        description="The clinical services shown in the public directory and used when assigning doctors."
        actions={<Button onClick={openCreate} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Add department</Button>}
      />

      {state.error ? (
        <Alert variant="error" title="Departments could not load">
          <p>{state.error}</p>
          <button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
        </Alert>
      ) : null}

      {state.loading ? (
        <ListSkeleton rows={4} />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-5 w-5" />}
          title="No departments yet"
          description="Create the first outpatient department before adding doctors."
          action={<Button onClick={openCreate}>Add department</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <article key={department.department_id} className="flex flex-col rounded-xl2 border border-line bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(department)}
                  className="rounded-lg p-2 text-muted transition hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  aria-label={`Edit ${department.department_name}`}
                  title="Edit department"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold text-ink">{department.department_name}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">{department.description ?? "No description has been added."}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-xs font-semibold text-muted">
                <Stethoscope className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {department.doctor_count ?? 0} {department.doctor_count === 1 ? "doctor" : "doctors"} assigned
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => { if (!saving) setCreateOpen(false); }}
        title="Add a department"
        description="Departments group doctors and outpatient services."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="create-department-form" loading={saving}>Create department</Button>
          </div>
        }
      >
        <form id="create-department-form" onSubmit={submitCreate} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Department could not be created">{formError}</Alert> : null}
          <Field label="Department name" htmlFor="new-department-name" error={fieldErrors.department_name} required>
            <Input id="new-department-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="For example: Neurology" invalid={Boolean(fieldErrors.department_name)} />
          </Field>
          <Field label="Description" htmlFor="new-department-description" error={fieldErrors.description} hint="Optional. This appears in the public directory.">
            <Textarea id="new-department-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[90px]" />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(editDepartment)}
        onClose={() => { if (!saving) setEditDepartment(null); }}
        title="Edit department"
        description={editDepartment ? `Department #${editDepartment.department_id}` : undefined}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditDepartment(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="edit-department-form" loading={saving}>Save changes</Button>
          </div>
        }
      >
        <form id="edit-department-form" onSubmit={submitEdit} noValidate className="space-y-4">
          {formError ? <Alert variant="error" title="Department could not be updated">{formError}</Alert> : null}
          <Field label="Department name" htmlFor="edit-department-name" error={fieldErrors.department_name} required>
            <Input id="edit-department-name" value={name} onChange={(event) => setName(event.target.value)} invalid={Boolean(fieldErrors.department_name)} />
          </Field>
          <Field label="Description" htmlFor="edit-department-description" error={fieldErrors.description}>
            <Textarea id="edit-department-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[90px]" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
