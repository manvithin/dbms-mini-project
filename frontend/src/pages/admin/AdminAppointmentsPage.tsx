import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, Printer, Search, XCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, errorMessage, queryString } from "../../api/client";
import type { AppointmentListResponse, DepartmentListResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Input, Select } from "../../components/Form";
import { ConfirmDialog } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { ListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { Tabs } from "../../components/Tabs";
import { formatDate, formatTime } from "../../utils/format";

const scopeItems = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];
const statuses = ["Booked", "Confirmed", "Checked In", "In Consultation", "Completed", "Cancelled", "No Show"];
const cancellable = ["Booked", "Confirmed", "Checked In"];

export function AdminAppointmentsPage() {
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = searchParams.get("scope") ?? "all";
  const status = searchParams.get("status") ?? "";
  const date = searchParams.get("date") ?? "";
  const departmentId = searchParams.get("department_id") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const [searchInput, setSearchInput] = useState(search);
  const [cancelTarget, setCancelTarget] = useState<AppointmentListResponse["appointments"][number] | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");

  const departmentsState = useApi<DepartmentListResponse>("/departments");
  const state = useApi<AppointmentListResponse>(
    `/admin/appointments${queryString({
      scope,
      status: status || undefined,
      date: date || undefined,
      department_id: departmentId || undefined,
      search: search || undefined,
      page,
      per_page: 10,
    })}`,
  );
  const appointments = state.data?.appointments ?? [];

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params, { replace: true });
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    updateParams({ search: searchInput.trim(), page: 1 });
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setActionError("");
    try {
      await api.post(`/admin/appointments/${cancelTarget.appointment_id}/cancel`);
      push("Appointment cancelled.", "success");
      setCancelTarget(null);
      state.reload();
    } catch (error) {
      setActionError(errorMessage(error));
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Appointment register"
        description="Search every outpatient booking, inspect the clinical record, and cancel appointments when required."
      />

      <form onSubmit={submitSearch} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <Tabs items={scopeItems} value={scope} onChange={(value) => updateParams({ scope: value, page: 1 })} label="Appointment period" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_11rem_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label className="sr-only" htmlFor="admin-appointment-search">Search patient or doctor</label>
              <Input id="admin-appointment-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Patient or doctor" className="pl-10" />
            </div>
            <div>
              <label className="sr-only" htmlFor="admin-appointment-status">Status</label>
              <Select id="admin-appointment-status" value={status} onChange={(event) => updateParams({ status: event.target.value, page: 1 })}>
                <option value="">All statuses</option>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </div>
            <div>
              <label className="sr-only" htmlFor="admin-appointment-date">Date</label>
              <Input id="admin-appointment-date" type="date" value={date} onChange={(event) => updateParams({ date: event.target.value, page: 1 })} />
            </div>
            <div>
              <label className="sr-only" htmlFor="admin-appointment-department">Department</label>
              <Select id="admin-appointment-department" value={departmentId} onChange={(event) => updateParams({ department_id: event.target.value, page: 1 })}>
                <option value="">All departments</option>
                {(departmentsState.data?.departments ?? []).map((department) => <option key={department.department_id} value={department.department_id}>{department.department_name}</option>)}
              </Select>
            </div>
            <Button type="submit" icon={<Search className="h-4 w-4" aria-hidden="true" />}>Search</Button>
          </div>
        </div>
        {status || date || departmentId || search || scope !== "all" ? (
          <button
            type="button"
            onClick={() => { setSearchInput(""); updateParams({ scope: "all", status: "", date: "", department_id: "", search: "", page: 1 }); }}
            className="mt-3 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Clear all filters
          </button>
        ) : null}
      </form>

      {actionError ? (
        <div className="mt-4"><Alert variant="error" title="Appointment could not be cancelled" onDismiss={() => setActionError("")}>{actionError}</Alert></div>
      ) : null}

      {state.error ? (
        <div className="mt-5"><Alert variant="error" title="Appointments could not load"><p>{state.error}</p><button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button></Alert></div>
      ) : null}

      <div className="mt-5">
        {state.loading ? (
          <ListSkeleton rows={6} />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No appointments match these filters"
            description="Try another date, status, or search phrase."
            action={<Button variant="secondary" onClick={() => { setSearchInput(""); updateParams({ scope: "all", status: "", date: "", department_id: "", search: "", page: 1 }); }}>Clear filters</Button>}
          />
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date and time</th>
                    <th>Status</th>
                    <th>Clinical</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.appointment_id}>
                      <td>
                        <p className="font-semibold text-ink">{appointment.patient?.name}</p>
                        <p className="mt-0.5 text-xs text-muted">#{appointment.appointment_id} | {appointment.patient?.phone}</p>
                      </td>
                      <td>
                        <p className="font-medium text-ink">{appointment.doctor?.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{appointment.doctor?.department_name}</p>
                      </td>
                      <td>
                        <p className="font-medium text-ink">{formatDate(appointment.appointment_date)}</p>
                        <p className="mt-0.5 text-xs text-muted">{formatTime(appointment.appointment_time)}</p>
                      </td>
                      <td><StatusBadge status={appointment.status} /></td>
                      <td>
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          {appointment.test_count > 0 ? <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-800">{appointment.test_count} tests</span> : null}
                          {appointment.has_diagnosis ? <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-800">Diagnosis</span> : null}
                          {appointment.has_prescription ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-800">Plan</span> : null}
                          {appointment.test_count === 0 && !appointment.has_diagnosis ? <span className="text-slate-400">None</span> : null}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/appointments/${appointment.appointment_id}`} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">View</Link>
                          <Link to={`/print/appointments/${appointment.appointment_id}/confirmation`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label={`Print confirmation for appointment ${appointment.appointment_id}`} title="Print confirmation">
                            <Printer className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {cancellable.includes(appointment.status) ? (
                            <button type="button" onClick={() => setCancelTarget(appointment)} className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-700" aria-label={`Cancel appointment ${appointment.appointment_id}`} title="Cancel appointment">
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              {state.data?.pagination ? <Pagination pagination={state.data.pagination} onPageChange={(nextPage) => updateParams({ page: nextPage })} label="appointments" /> : null}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => { if (!cancelling) setCancelTarget(null); }}
        onConfirm={confirmCancel}
        title="Cancel this appointment?"
        description={cancelTarget ? `${cancelTarget.patient?.name} with ${cancelTarget.doctor?.name} on ${formatDate(cancelTarget.appointment_date)} at ${formatTime(cancelTarget.appointment_time)}.` : ""}
        confirmLabel="Cancel appointment"
        loading={cancelling}
      />
    </div>
  );
}
