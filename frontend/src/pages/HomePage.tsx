import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  ChevronRight,
  Clock3,
  FileHeart,
  HeartPulse,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { queryString } from "../api/client";
import type { DepartmentListResponse, DoctorListResponse } from "../types";
import { Alert } from "../components/Alert";
import { Button, LinkButton } from "../components/Button";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { EmptyState } from "../components/EmptyState";
import { Input, Select } from "../components/Form";
import { Pagination } from "../components/Pagination";
import { ListSkeleton } from "../components/Skeleton";
import { useAuth } from "../auth/AuthContext";
import { departmentVisual } from "../utils/visuals";

export function HomePage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);

  const departmentsState = useApi<DepartmentListResponse>("/departments");
  const doctorPath = useMemo(
    () =>
      `/doctors${queryString({
        search,
        department_id: departmentId || undefined,
        page,
        per_page: 6,
      })}`,
    [search, departmentId, page],
  );
  const doctorsState = useApi<DoctorListResponse>(doctorPath);
  const departments = departmentsState.data?.departments ?? [];
  const doctors = doctorsState.data?.doctors ?? [];
  const pagination = doctorsState.data?.pagination;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function chooseDepartment(id: string) {
    setDepartmentId(id);
    setPage(1);
  }

  const bookingLink = user?.role === "patient" ? "/patient/book" : "/login?next=%2Fpatient%2Fbook";

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full border border-brand-200/60" />
          <div className="absolute -left-12 top-32 h-44 w-44 rounded-full border border-brand-200/50" />
          <div className="absolute right-[-8rem] top-[-6rem] h-[28rem] w-[28rem] rounded-full bg-brand-100/40 blur-3xl" />
          <div className="absolute bottom-[-6rem] left-1/3 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl" />
        </div>
        <div className="content-width relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />
              General Hospital | Bengaluru
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-[2.7rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
              Specialist outpatient care, without the rush.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Find the right doctor, see genuine clinic availability, and keep every visit in one calm record.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton to={bookingLink} size="lg" icon={<CalendarCheck2 className="h-5 w-5" aria-hidden="true" />}>
                Book an appointment
              </LinkButton>
              <a
                href="#doctors"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-base font-semibold text-ink shadow-sm transition hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
              >
                Meet our doctors
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4 shadow-soft">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-2xl font-semibold text-brand-900">
                  {departmentsState.loading ? "..." : departments.length}
                </p>
                <p className="text-xs font-semibold text-muted">Departments</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-soft">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-2xl font-semibold text-rose-900">
                  {pagination ? pagination.total : "..."}
                </p>
                <p className="text-xs font-semibold text-muted">Specialists</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-soft">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                  <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-2xl font-semibold text-sky-900">Online</p>
                <p className="text-xs font-semibold text-muted">Booking</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg animate-fade-up lg:mx-0" style={{ animationDelay: "100ms" }}>
            <div className="absolute -right-4 -top-4 h-24 w-24 rotate-6 rounded-3xl bg-gold-100/80" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-lift backdrop-blur">
              <img src="/art/health-hero.svg" alt="" className="w-full rounded-[1.6rem]" />
            </div>
            <div className="absolute -left-3 top-10 hidden items-center gap-2 rounded-2xl border border-line bg-white/95 px-3.5 py-2.5 text-xs font-semibold text-ink shadow-lift backdrop-blur sm:flex">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Live clinic slots
            </div>
            <div className="absolute -right-2 bottom-12 hidden items-center gap-2 rounded-2xl border border-line bg-white/95 px-3.5 py-2.5 text-xs font-semibold text-ink shadow-lift backdrop-blur sm:flex">
              <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Private records
            </div>
          </div>
        </div>
      </section>

      <section id="doctors" className="content-width scroll-mt-24 py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="eyebrow">Doctor directory</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Find the right care team</h2>
            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              Search by doctor, specialty, or department. Open a profile to see clinic days and open slots.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-muted shadow-sm">
            <Sparkles className="h-4 w-4 text-gold-500" aria-hidden="true" />
            {pagination
              ? `${pagination.total} ${pagination.total === 1 ? "specialist" : "specialists"} available`
              : "Loading specialists"}
          </div>
        </div>

        <form onSubmit={submitSearch} className="mt-7 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-[1fr_15rem_auto]">
          <label className="sr-only" htmlFor="doctor-search">Search doctors</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              id="doctor-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, specialty, or department"
              className="pl-10"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="department-filter">Filter by department</label>
            <Select id="department-filter" value={departmentId} onChange={(event) => chooseDepartment(event.target.value)}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.department_id} value={department.department_id}>
                  {department.department_name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" icon={<Search className="h-4 w-4" aria-hidden="true" />}>
            Search doctors
          </Button>
        </form>

        {doctorsState.error ? (
          <div className="mt-6">
            <Alert variant="error" title="The doctor directory could not load">
              <p>{doctorsState.error}</p>
              <button type="button" onClick={doctorsState.reload} className="mt-2 font-semibold underline underline-offset-2">
                Try again
              </button>
            </Alert>
          </div>
        ) : null}

        {doctorsState.loading ? (
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ListSkeleton rows={6} />
          </div>
        ) : doctors.length === 0 ? (
          <div className="mt-7">
            <EmptyState
              icon={<UsersRound className="h-5 w-5" />}
              title="No doctors match this search"
              description="Try another name or choose a different department."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setDepartmentId("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doctors.map((doctor) => {
              const visual = departmentVisual(doctor.department_name);
              return (
                <article
                  key={doctor.doctor_id}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${visual.gradient}`} aria-hidden="true" />
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <div className={`absolute -inset-1 rounded-full bg-gradient-to-br ${visual.gradient} opacity-15`} aria-hidden="true" />
                        <DoctorAvatar name={doctor.name} size="xl" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-xl font-semibold leading-tight text-ink">{doctor.name}</h3>
                        <p className={`mt-1 text-sm font-semibold ${visual.text}`}>{doctor.specialization}</p>
                        <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${visual.chip}`}>
                          <img src={visual.image} alt="" className="h-4 w-4 rounded" />
                          {doctor.department_name}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <Stethoscope className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                        Outpatient care
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <Clock3 className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
                        Clinic hours
                      </span>
                    </div>
                    <Link
                      to={`/doctors/${doctor.doctor_id}`}
                      className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink transition group-hover:border-brand-200 group-hover:bg-brand-50/60 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      View profile and slots
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination ? (
          <Pagination pagination={pagination} onPageChange={setPage} label="doctors" />
        ) : null}
      </section>

      <section id="departments" className="scroll-mt-24 border-y border-line bg-white py-14 sm:py-20">
        <div className="content-width">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="eyebrow">Departments</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Care organized around you</h2>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base">Each department brings together specialists, clinic schedules, and a shared care record.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
              <HeartPulse className="h-4 w-4" aria-hidden="true" />
              {departments.length > 0 ? `${departments.length} outpatient services` : "Outpatient services"}
            </div>
          </div>
          {departmentsState.loading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ListSkeleton rows={6} />
            </div>
          ) : departmentsState.error ? (
            <div className="mt-8">
              <Alert variant="error" title="Departments could not load">
                <p>{departmentsState.error}</p>
                <button type="button" onClick={departmentsState.reload} className="mt-2 font-semibold underline underline-offset-2">
                  Try again
                </button>
              </Alert>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((department) => {
                const visual = departmentVisual(department.department_name);
                return (
                  <div
                    key={department.department_id}
                    className="group relative overflow-hidden rounded-2xl border border-line p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${visual.gradient}`} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <img src={visual.image} alt="" className="h-14 w-14 rounded-2xl shadow-sm" />
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${visual.chip}`}>
                        {department.doctor_count ?? 0} {department.doctor_count === 1 ? "doctor" : "doctors"}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-xl font-semibold text-ink">{department.department_name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{department.description}</p>
                    <button
                      type="button"
                      onClick={() => {
                        chooseDepartment(String(department.department_id));
                        setSearch("");
                        setSearchInput("");
                        document.getElementById("doctors")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${visual.text} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300`}
                    >
                      See department doctors
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="how-it-works" className="content-width scroll-mt-24 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">A simpler visit</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Three calm steps to care</h2>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">Book online, meet your doctor, and leave with a clear plan in your own record.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              number: "01",
              icon: Search,
              title: "Find your specialist",
              text: "Compare departments, doctors, and real clinic days before choosing a time.",
              card: "border-sky-100 from-sky-50 via-white to-white",
              tile: "from-sky-500 to-blue-600",
              numberTone: "text-sky-100",
            },
            {
              number: "02",
              icon: CalendarCheck2,
              title: "Book the right slot",
              text: "Reserve a real open time. If it is taken, you see it immediately.",
              card: "border-amber-100 from-amber-50 via-white to-white",
              tile: "from-amber-400 to-orange-500",
              numberTone: "text-amber-100",
            },
            {
              number: "03",
              icon: FileHeart,
              title: "Keep the whole story",
              text: "Results, diagnosis, and treatment notes stay connected to your visit.",
              card: "border-rose-100 from-rose-50 via-white to-white",
              tile: "from-rose-500 to-pink-600",
              numberTone: "text-rose-100",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-soft ${step.card}`}>
                <span className={`absolute right-5 top-4 font-display text-4xl font-semibold ${step.numberTone}`} aria-hidden="true">{step.number}</span>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${step.tile}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
              </div>
            );
          })}
        </div>
        <div className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-6 py-8 text-white shadow-lift sm:px-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-56 w-56 rounded-full bg-brand-600/50 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Ready when you are</p>
              <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Start with a doctor who listens</h2>
              <p className="mt-2 text-sm leading-6 text-brand-100">Create a patient account to book a visit and keep your complete outpatient record together.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <LinkButton to={bookingLink} className="bg-white !text-brand-900 hover:!bg-brand-50" icon={<CalendarCheck2 className="h-4 w-4" aria-hidden="true" />}>
                  Book now
                </LinkButton>
                <LinkButton to={user ? "/" : "/register"} variant="secondary" className="border-white/25 !bg-transparent !text-white hover:!bg-white/10">
                  {user ? "Back to directory" : "Create account"}
                </LinkButton>
              </div>
            </div>
            <img src="/art/care-connection.svg" alt="" className="hidden w-64 shrink-0 drop-shadow-2xl md:block" />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Clinic hours shown are real schedule data. For urgent symptoms, contact the hospital reception directly.
        </p>
      </section>
    </>
  );
}
