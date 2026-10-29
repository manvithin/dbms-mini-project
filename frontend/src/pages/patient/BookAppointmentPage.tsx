import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage, queryString } from "../../api/client";
import type { Availability, DepartmentListResponse, Doctor, DoctorDetailResponse, DoctorListResponse } from "../../types";
import { useToast } from "../../components/Toast";
import { DoctorAvatar } from "../../components/DoctorAvatar";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, Input, Select, Textarea } from "../../components/Form";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { formatDateLong, formatTime, parseDateOnly, todayISO } from "../../utils/format";
import { departmentVisual } from "../../utils/visuals";

function nextDays(count: number) {
  const today = parseDateOnly(todayISO());
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date),
      date: String(date.getDate()),
      month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date),
    };
  });
}

export function BookAppointmentPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const initialDoctor = searchParams.get("doctor_id") ?? "";
  const initialDate = searchParams.get("date") ?? todayISO();
  const initialTime = searchParams.get("time") ?? "";

  const [departmentId, setDepartmentId] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorId, setDoctorId] = useState(initialDoctor);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const departmentsState = useApi<DepartmentListResponse>("/departments");
  const doctorsState = useApi<DoctorListResponse>("/doctors?per_page=50");
  const doctorState = useApi<DoctorDetailResponse>(doctorId ? `/doctors/${doctorId}` : null);
  const availabilityState = useApi<Availability>(
    doctorId ? `/doctors/${doctorId}/availability${queryString({ date })}` : null,
  );

  const days = useMemo(() => nextDays(7), []);
  const doctors = doctorsState.data?.doctors ?? [];
  const filteredDoctors = doctors.filter((doctor) => {
    const matchesDepartment = !departmentId || String(doctor.department_id) === departmentId;
    const text = doctorSearch.trim().toLowerCase();
    const matchesSearch =
      !text ||
      doctor.name.toLowerCase().includes(text) ||
      doctor.specialization.toLowerCase().includes(text) ||
      (doctor.department_name ?? "").toLowerCase().includes(text);
    return matchesDepartment && matchesSearch;
  });
  const selectedDoctor = doctorState.data?.doctor ?? doctors.find((item) => String(item.doctor_id) === doctorId);
  const availability = availabilityState.data;

  useEffect(() => {
    if (doctorId && availabilityState.data && !availabilityState.data.slots.some((slot) => slot.start_time === time)) {
      if (!availabilityState.loading) setTime("");
    }
  }, [availabilityState.data, availabilityState.loading, doctorId, time]);

  function selectDoctor(doctor: Doctor) {
    setDoctorId(String(doctor.doctor_id));
    setTime("");
    setFormError("");
    setConflict(false);
    setFieldErrors((current) => ({ ...current, doctor_id: "" }));
  }

  function changeDate(nextDate: string) {
    setDate(nextDate);
    setTime("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!doctorId) errors.doctor_id = "Choose a doctor.";
    if (!date) errors.appointment_date = "Choose a date.";
    if (!time) errors.appointment_time = "Choose an available time.";
    if (!reason.trim()) errors.reason_for_visit = "Tell the care team why you are visiting.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setConflict(false);
    try {
      const response = await api.post<{ appointment: { appointment_id: number } }>("/appointments", {
        doctor_id: Number(doctorId),
        appointment_date: date,
        appointment_time: time,
        reason_for_visit: reason.trim(),
      });
      push("Appointment booked successfully.", "success");
      navigate(`/patient/appointments/${response.appointment.appointment_id}?booked=1`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) setFieldErrors((current) => ({ ...current, ...error.fields }));
        if (error.code === "slot_conflict" || error.code === "slot_unavailable" || error.code === "doctor_unavailable") {
          setConflict(true);
          setTime("");
          availabilityState.reload();
        }
      }
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="New appointment"
        title="Book the right time for your care"
        description="Choose a doctor, date, and open slot. Availability comes directly from the hospital schedule."
      />

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-emerald-500 text-sm font-bold text-white shadow-sm">1</span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Choose a doctor</h2>
                  <p className="mt-1 text-sm text-muted">Filter by department or search for a specialization.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_14rem]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <label className="sr-only" htmlFor="booking-doctor-search">Search doctors</label>
                  <Input id="booking-doctor-search" value={doctorSearch} onChange={(event) => setDoctorSearch(event.target.value)} placeholder="Search doctors" className="pl-10" />
                </div>
                <div>
                  <label className="sr-only" htmlFor="booking-department">Department</label>
                  <Select id="booking-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                    <option value="">All departments</option>
                    {(departmentsState.data?.departments ?? []).map((department) => (
                      <option key={department.department_id} value={department.department_id}>{department.department_name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              {fieldErrors.doctor_id ? <p className="mt-2 text-xs font-medium text-rose-700" role="alert">{fieldErrors.doctor_id}</p> : null}

              <div className="mt-4">
                {doctorsState.loading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}
                  </div>
                ) : doctorsState.error ? (
                  <Alert variant="error" title="Doctors could not load">
                    <p>{doctorsState.error}</p>
                    <button type="button" onClick={doctorsState.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
                  </Alert>
                ) : filteredDoctors.length === 0 ? (
                  <EmptyState
                    icon={<UserRound className="h-5 w-5" />}
                    title="No doctors match this filter"
                    description="Try a different department or search phrase."
                    action={<Button type="button" variant="secondary" onClick={() => { setDepartmentId(""); setDoctorSearch(""); }}>Clear filters</Button>}
                  />
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Choose a doctor">
                    {filteredDoctors.map((doctor) => {
                      const selected = String(doctor.doctor_id) === doctorId;
                      return (
                        <button
                          key={doctor.doctor_id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => selectDoctor(doctor)}
                          className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                            selected ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-line bg-white hover:border-brand-200 hover:bg-brand-50/40"
                          }`}
                        >
                          <DoctorAvatar name={doctor.name} size="md" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">{doctor.name}</span>
                            <span className="mt-0.5 block text-xs font-medium text-brand-700">{doctor.specialization}</span>
                            <span className="mt-0.5 block text-xs text-muted">{doctor.department_name}</span>
                          </span>
                          <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white"}`}>
                            {selected ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-sm">2</span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Choose a date and time</h2>
                  <p className="mt-1 text-sm text-muted">
                    {selectedDoctor ? `Open slots for ${selectedDoctor.name}.` : "Choose a doctor first to see open slots."}
                  </p>
                </div>
              </div>

              {!doctorId ? (
                <div className="mt-5 rounded-xl border border-dashed border-line bg-slate-50 px-4 py-8 text-center text-sm text-muted">
                  Select a doctor above to view real clinic availability.
                </div>
              ) : doctorState.error ? (
                <div className="mt-5">
                  <Alert variant="error" title="Doctor details could not load"><p>{doctorState.error}</p></Alert>
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-2 sm:grid-cols-7">
                    {days.map((day) => {
                      const selected = date === day.iso;
                      return (
                        <button
                          key={day.iso}
                          type="button"
                          onClick={() => changeDate(day.iso)}
                          aria-pressed={selected}
                          className={`rounded-xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                            selected ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-ink hover:border-brand-200 hover:bg-brand-50"
                          }`}
                        >
                          <span className={`block text-[10px] font-bold uppercase ${selected ? "text-brand-100" : "text-muted"}`}>{day.day}</span>
                          <span className="mt-1 block font-display text-lg font-semibold">{day.date}</span>
                          <span className={`block text-[10px] ${selected ? "text-brand-100" : "text-muted"}`}>{day.month}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{formatDateLong(date)}</p>
                    <div>
                      <label htmlFor="booking-date" className="sr-only">Choose another date</label>
                      <Input id="booking-date" type="date" min={todayISO()} value={date} onChange={(event) => changeDate(event.target.value)} className="w-auto" />
                    </div>
                  </div>
                  {fieldErrors.appointment_time ? <p className="mt-3 text-xs font-medium text-rose-700" role="alert">{fieldErrors.appointment_time}</p> : null}
                  <div className="mt-4">
                    {availabilityState.loading ? (
                      <div className="grid gap-2 sm:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-11" />)}
                      </div>
                    ) : availabilityState.error ? (
                      <Alert variant="error" title="Availability could not load">
                        <p>{availabilityState.error}</p>
                        <button type="button" onClick={availabilityState.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
                      </Alert>
                    ) : availability && availability.slots.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-4">
                        {availability.slots.map((slot) => {
                          const selected = time === slot.start_time;
                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              onClick={() => { setTime(slot.start_time); setFieldErrors((current) => ({ ...current, appointment_time: "" })); }}
                              aria-pressed={selected}
                              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                                selected ? "border-brand-700 bg-brand-700 text-white" : "border-brand-200 bg-brand-50 text-brand-900 hover:border-brand-300 hover:bg-brand-100"
                              }`}
                            >
                              {formatTime(slot.start_time)}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<CalendarDays className="h-5 w-5" />}
                        title={availability?.has_schedule ? "No open slots on this date" : "No clinic hours on this date"}
                        description={availability?.message ?? "Try another date to see open appointment times."}
                      />
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow-sm">3</span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Tell us about the visit</h2>
                  <p className="mt-1 text-sm text-muted">A short reason helps your doctor prepare for the consultation.</p>
                </div>
              </div>
              <div className="mt-5">
                <Field label="Reason for visit" htmlFor="booking-reason" error={fieldErrors.reason_for_visit} required hint="For example: recurring headaches, medicine review, or a skin concern.">
                  <Textarea
                    id="booking-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Describe the main concern in your own words"
                    maxLength={500}
                    invalid={Boolean(fieldErrors.reason_for_visit)}
                  />
                </Field>
                <p className="mt-1 text-right text-xs text-muted">{reason.length} of 500 characters</p>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-6">
              <p className="eyebrow">Booking summary</p>
              {selectedDoctor ? (
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={selectedDoctor.name} size="lg" />
                    <div>
                      <p className="font-display text-lg font-semibold leading-tight text-ink">{selectedDoctor.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{selectedDoctor.specialization}</p>
                      <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${departmentVisual(selectedDoctor.department_name).chip}`}>
                        <img src={departmentVisual(selectedDoctor.department_name).image} alt="" className="h-3.5 w-3.5 rounded" />
                        {selectedDoctor.department_name}
                      </span>
                    </div>
                  </div>
                  <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="inline-flex items-center gap-2 text-muted"><CalendarDays className="h-4 w-4" aria-hidden="true" />Date</dt>
                      <dd className="text-right font-semibold text-ink">{date ? formatDateLong(date) : "Not selected"}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="inline-flex items-center gap-2 text-muted"><Clock3 className="h-4 w-4" aria-hidden="true" />Time</dt>
                      <dd className="text-right font-semibold text-ink">{time ? formatTime(time) : "Not selected"}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="inline-flex items-center gap-2 text-muted"><Stethoscope className="h-4 w-4" aria-hidden="true" />Department</dt>
                      <dd className="text-right font-semibold text-ink">{selectedDoctor.department_name}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-line bg-slate-50 px-4 py-7 text-center text-sm text-muted">
                  Your doctor and time will appear here as you choose them.
                </div>
              )}

              {formError ? (
                <div className="mt-4">
                  <Alert variant={conflict ? "warning" : "error"} title={conflict ? "That slot was just taken" : "Booking could not be completed"}>
                    <p>{formError}</p>
                    {conflict ? <p className="mt-1 text-xs">The latest open slots are shown. Choose another time to continue.</p> : null}
                  </Alert>
                </div>
              ) : null}

              {fieldErrors.appointment_date ? <p className="mt-3 text-xs font-medium text-rose-700" role="alert">{fieldErrors.appointment_date}</p> : null}

              <Button type="submit" size="lg" className="mt-5 w-full" loading={submitting} disabled={!doctorId || !time || !reason.trim()} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
                {submitting ? "Confirming appointment" : "Confirm appointment"}
              </Button>
              {!doctorId || !time || !reason.trim() ? (
                <p className="mt-2 text-center text-[11px] leading-5 text-muted">
                  Choose a doctor, an open slot, and enter a reason to enable confirmation.
                </p>
              ) : null}
              <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-muted">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                Appointments can be cancelled up to two hours before the start time.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
