import { useSearchParams } from "react-router-dom";
import { FileHeart, Plus, Printer } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { queryString } from "../../api/client";
import type { RecordListResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { AppointmentRecordCard } from "../../components/ClinicalRecord";
import { LinkButton } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Pagination } from "../../components/Pagination";
import { ListSkeleton } from "../../components/Skeleton";

export function PatientRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const state = useApi<RecordListResponse>(`/patients/me/records${queryString({ page, per_page: 5 })}`);
  const records = state.data?.records ?? [];

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="My records"
        title="Your outpatient care record"
        description="Review test results, diagnosis, treatment plans, and follow up dates from your completed visits."
        actions={
          <>
            <LinkButton to="/print/appointments/history" variant="secondary" icon={<Printer className="h-4 w-4" aria-hidden="true" />}>
              Print history
            </LinkButton>
            <LinkButton to="/patient/book" icon={<Plus className="h-4 w-4" aria-hidden="true" />}>
              Book appointment
            </LinkButton>
          </>
        }
      />

      {state.error ? (
        <div className="mb-5">
          <Alert variant="error" title="Clinical records could not load">
            <p>{state.error}</p>
            <button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
          </Alert>
        </div>
      ) : null}

      {state.loading ? (
        <ListSkeleton rows={4} />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<FileHeart className="h-5 w-5" />}
          title="No clinical records yet"
          description="After a consultation, any test results, diagnosis, and treatment plan will appear here. Your doctor can record a diagnosis without ordering tests."
          action={<LinkButton to="/patient/book">Book an appointment</LinkButton>}
        />
      ) : (
        <div className="space-y-5">
          {records.map((record) => <AppointmentRecordCard key={record.appointment_id} appointment={record} />)}
        </div>
      )}

      {state.data?.pagination ? (
        <Pagination pagination={state.data.pagination} onPageChange={changePage} label="visits" />
      ) : null}
    </div>
  );
}
