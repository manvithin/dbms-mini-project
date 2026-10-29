import { useSearchParams } from "react-router-dom";
import { CalendarDays, Filter, RotateCcw } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { queryString } from "../../api/client";
import type { AppointmentListResponse } from "../../types";
import { AppointmentCard } from "../../components/AppointmentCard";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Input, Select } from "../../components/Form";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { ListSkeleton } from "../../components/Skeleton";
import { Tabs } from "../../components/Tabs";

const scopeItems = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];
const statuses = ["Booked", "Confirmed", "Checked In", "In Consultation", "Completed", "Cancelled", "No Show"];

export function DoctorAppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = searchParams.get("scope") ?? "today";
  const status = searchParams.get("status") ?? "";
  const date = searchParams.get("date") ?? "";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const state = useApi<AppointmentListResponse>(
    `/doctor/appointments${queryString({ scope, status: status || undefined, date: date || undefined, page, per_page: 8 })}`,
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

  const filtersActive = Boolean(status || date || scope !== "today");

  return (
    <div>
      <PageHeader
        eyebrow="Doctor workspace"
        title="Appointment list"
        description="Review every visit assigned to you. Open a visit to update status and complete the consultation."
      />

      <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <Tabs items={scopeItems} value={scope} onChange={(value) => updateParams({ scope: value, page: 1 })} label="Appointment period" />
          <div className="grid gap-3 sm:grid-cols-[11rem_11rem_auto]">
            <div>
              <label htmlFor="doctor-status" className="sr-only">Status</label>
              <Select id="doctor-status" value={status} onChange={(event) => updateParams({ status: event.target.value, page: 1 })}>
                <option value="">All statuses</option>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="doctor-date" className="sr-only">Appointment date</label>
              <Input id="doctor-date" type="date" value={date} onChange={(event) => updateParams({ date: event.target.value, page: 1 })} />
            </div>
            <Button variant="secondary" onClick={() => updateParams({ scope: "today", status: "", date: "", page: 1 })} disabled={!filtersActive} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
              Reset
            </Button>
          </div>
        </div>
        {filtersActive ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Filters are active. Reset to return to today's full list.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <div className="mt-5">
          <Alert variant="error" title="Appointments could not load">
            <p>{state.error}</p>
            <button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </Alert>
        </div>
      ) : null}

      <div className="mt-5">
        {state.loading ? (
          <ListSkeleton rows={5} />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No appointments match these filters"
            description="Try another period or clear the status and date filters."
            action={<Button variant="secondary" onClick={() => updateParams({ scope: "today", status: "", date: "", page: 1 })}>Clear filters</Button>}
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.appointment_id}
                appointment={appointment}
                to={`/doctor/appointments/${appointment.appointment_id}`}
                showPatient
              />
            ))}
          </div>
        )}
      </div>

      {state.data?.pagination ? (
        <Pagination pagination={state.data.pagination} onPageChange={(nextPage) => updateParams({ page: nextPage })} label="appointments" />
      ) : null}
    </div>
  );
}
