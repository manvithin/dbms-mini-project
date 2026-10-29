import { LinkButton } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { AppointmentCard } from "../../components/AppointmentCard";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Select } from "../../components/Form";
import { ListSkeleton } from "../../components/Skeleton";
import { Pagination } from "../../components/Pagination";
import { Tabs } from "../../components/Tabs";
import { useApi } from "../../hooks/useApi";
import { queryString } from "../../api/client";
import type { AppointmentListResponse } from "../../types";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Plus, Printer } from "lucide-react";

const scopeItems = [
  { id: "all", label: "All visits" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const statuses = ["Booked", "Confirmed", "Checked In", "In Consultation", "Completed", "Cancelled", "No Show"];

export function PatientAppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = searchParams.get("scope") ?? "all";
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  const state = useApi<AppointmentListResponse>(
    `/patients/me/appointments${queryString({ scope, status: status || undefined, page, per_page: 8 })}`,
  );

  function updateParams(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params, { replace: true });
  }

  const appointments = state.data?.appointments ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="My appointments"
        title="Your visits, in one place"
        description="Review upcoming and past appointments, open clinical notes, and print your visit history."
        actions={
          <>
            <LinkButton to="/print/appointments/history" variant="secondary" icon={<Printer className="h-4 w-4" aria-hidden="true" />}>
              Print history
            </LinkButton>
            <LinkButton to="/patient/book" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              New appointment
            </LinkButton>
          </>
        }
      />

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center">
        <Tabs
          items={scopeItems}
          value={scope}
          onChange={(value) => updateParams({ scope: value, page: 1 })}
          label="Appointment period"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-muted">Status</label>
          <Select id="status-filter" value={status} onChange={(event) => updateParams({ status: event.target.value, page: 1 })} className="w-44">
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
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
          <ListSkeleton rows={4} />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title={status || scope !== "all" ? "No appointments match these filters" : "No appointments yet"}
            description={
              status || scope !== "all"
                ? "Try another period or clear the status filter."
                : "Book your first outpatient visit to see it here."
            }
            action={
              status || scope !== "all" ? (
                <Button variant="secondary" onClick={() => updateParams({ scope: "all", status: "", page: 1 })}>Clear filters</Button>
              ) : (
                <LinkButton to="/patient/book">Book an appointment</LinkButton>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.appointment_id}
                appointment={appointment}
                to={`/patient/appointments/${appointment.appointment_id}`}
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
