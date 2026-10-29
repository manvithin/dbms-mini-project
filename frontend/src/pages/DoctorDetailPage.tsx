import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Phone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { queryString } from "../api/client";
import type { Availability, DoctorDetailResponse } from "../types";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Button, LinkButton } from "../components/Button";
import { Card, SectionCard } from "../components/Card";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Form";
import { PageLoading, Skeleton } from "../components/Skeleton";
import { dayNames, formatDateLong, formatTime, formatTimeRange, parseDateOnly, todayISO } from "../utils/format";
import { departmentVisual } from "../utils/visuals";

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

export function DoctorDetailPage() {
  const { doctorId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const days = useMemo(() => nextDays(7), []);

  const doctorState = useApi<DoctorDetailResponse>(doctorId ? `/doctors/${doctorId}` : null);
  const availabilityState = useApi<Availability>(
    doctorId ? `/doctors/${doctorId}/availability${queryString({ date })}` : null,
  );

  if (doctorState.loading) return <PageLoading label="Loading doctor profile" />;
  if (doctorState.error || !doctorState.data) {
    return (
      <div className="content-width py-14">
        <Alert variant="error" title="Doctor profile could not load">
          <p>{doctorState.error ?? "The doctor could not be found."}</p>
          <div className="mt-3 flex gap-3">
            <Button variant="secondary" size="sm" onClick={doctorState.reload}>Try again</Button>
            <LinkButton to="/" variant="ghost" size="sm">Back to directory</LinkButton>
          </div>
        </Alert>
      </div>
    );
  }

  const { doctor, schedules } = doctorState.data;
  const availability = availabilityState.data;
  const canBook = !user || user.role === "patient";
  const visual = departmentVisual(doctor.department_name);
  const clinicDays = new Set(schedules.map((schedule) => schedule.day_of_week)).size;

  function chooseSlot(startTime: string) {
    const next = `/patient/book${queryString({ doctor_id: doctor.doctor_id, date, time: startTime })}`;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (user.role === "patient") navigate(next);
  }

  return (
    <div className="content-width py-8 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to doctor directory
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="flex flex-col overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-6 py-8 text-white sm:px-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/10" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center gap-6">
              <div className="relative">
                <div className="absolute -inset-2 rounded-[1.4rem] border border-white/20" aria-hidden="true" />
                <DoctorAvatar name={doctor.name} size="2xl" shape="rounded" />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-50">
                  <img src={visual.image} alt="" className="h-4 w-4 rounded" />
                  {doctor.department_name}
                </span>
                <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{doctor.name}</h1>
                <p className="mt-1 text-brand-100">{doctor.specialization}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 px-6 py-6 sm:grid-cols-3 sm:px-8">
            <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
                <Stethoscope className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Specialty</p>
                <p className="mt-1 text-sm font-semibold text-ink">{doctor.specialization}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Hospital desk</p>
                <p className="mt-1 text-sm font-semibold text-ink">{doctor.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Clinic days</p>
                <p className="mt-1 text-sm font-semibold text-ink">{clinicDays} {clinicDays === 1 ? "day" : "days"} each week</p>
              </div>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-5 border-t border-line bg-gradient-to-r from-brand-50/70 via-white to-sky-50/60 px-6 py-5 sm:px-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Connected outpatient care</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                One record follows every visit, from the first booking to results, diagnosis, and treatment notes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-brand-800">Live slots</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800">Private records</span>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">One care team</span>
              </div>
            </div>
            <img src="/art/care-connection.svg" alt="" className="hidden w-36 shrink-0 sm:block" />
          </div>
          <div className="border-t border-line bg-slate-50/60 px-6 py-4 text-sm leading-6 text-muted sm:px-8">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
              Appointments are available to signed in patients. Public visitors can compare clinic hours and sign in when ready to book.
            </p>
          </div>
        </Card>

        <SectionCard
          title="Clinic hours"
          description="Weekly outpatient sessions for this doctor."
        >
          {schedules.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="No clinic hours published"
              description="This doctor has no active weekly sessions at the moment. Please contact reception for help."
            />
          ) : (
            <ul className="space-y-2.5">
              {schedules.map((schedule) => (
                <li key={schedule.schedule_id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase ${visual.soft} ${visual.text}`}>
                    {dayNames[schedule.day_of_week].slice(0, 3)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{dayNames[schedule.day_of_week]}</p>
                    <p className="text-xs text-muted">{formatTimeRange(schedule.start_time, schedule.end_time)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${visual.chip}`}>
                    {schedule.slot_duration_minutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Choose an appointment time"
        description="Only genuine open slots are shown. Availability is checked again when you confirm."
        className="mt-6"
        action={
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Live availability
          </div>
        }
      >
        <div className="grid gap-2 sm:grid-cols-7">
          {days.map((day) => {
            const selected = date === day.iso;
            return (
              <button
                key={day.iso}
                type="button"
                onClick={() => setDate(day.iso)}
                aria-pressed={selected}
                className={`rounded-xl border px-2 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                  selected
                    ? "border-brand-700 bg-brand-700 text-white shadow-soft"
                    : "border-line bg-white text-ink hover:border-brand-200 hover:bg-brand-50"
                }`}
              >
                <span className={`block text-[11px] font-bold uppercase tracking-wide ${selected ? "text-brand-100" : "text-muted"}`}>{day.day}</span>
                <span className="mt-1 block font-display text-xl font-semibold">{day.date}</span>
                <span className={`block text-[11px] ${selected ? "text-brand-100" : "text-muted"}`}>{day.month}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div>
            <p className="text-sm font-semibold text-ink">{formatDateLong(date)}</p>
            <p className="text-xs text-muted">Choose another date if the clinic is closed or fully booked.</p>
          </div>
          <div className="w-full sm:w-52">
            <label htmlFor="availability-date" className="sr-only">Choose a date</label>
            <Input id="availability-date" type="date" min={todayISO()} value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>

        <div className="mt-5">
          {availabilityState.loading ? (
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : availabilityState.error ? (
            <Alert variant="error" title="Availability could not load">
              <p>{availabilityState.error}</p>
              <button type="button" onClick={availabilityState.reload} className="mt-2 font-semibold underline underline-offset-2">
                Try again
              </button>
            </Alert>
          ) : availability && availability.slots.length > 0 ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {availability.slots.map((slot) => (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() => chooseSlot(slot.start_time)}
                    disabled={!canBook}
                    title={!canBook ? "Sign in with a patient account to book this slot" : undefined}
                    className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-line disabled:bg-slate-50 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
              {!canBook ? (
                <div className="mt-4">
                  <Alert variant="info" title="Booking needs a patient account">
                    You are signed in as {user?.role}. Sign in with a patient account to reserve a slot.
                    <Link to="/patient" className="ml-1 font-semibold underline underline-offset-2">Go to your dashboard</Link>
                  </Alert>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title={availability?.has_schedule ? "No slots remain for this date" : "No clinic hours on this day"}
              description={availability?.message ?? "Try another date to see open appointment times."}
              action={<Button variant="secondary" onClick={() => setDate(days[1]?.iso ?? todayISO())}>Try tomorrow</Button>}
            />
          )}
        </div>
        {user?.role === "patient" ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Your booking will be confirmed instantly and saved to your record.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
