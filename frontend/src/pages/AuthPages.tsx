import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, HeartPulse, LockKeyhole, ShieldCheck, Stethoscope } from "lucide-react";
import { useAuth, roleHome } from "../auth/AuthContext";
import { ApiError, errorMessage } from "../api/client";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Field, Input } from "../components/Form";
import { useToast } from "../components/Toast";
import { Logo } from "../components/Logo";

const demoAccounts = [
  { role: "Patient", email: "riya.kapoor@example.com", password: "Patient@123" },
  { role: "Doctor", email: "meera.iyer@example.com", password: "Doctor@123" },
  { role: "Administrator", email: "admin@cityhospital.example", password: "Admin@123" },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (user) {
      navigate(nextPath && nextPath.startsWith("/") ? nextPath : roleHome(user.role), { replace: true });
    }
  }, [user, nextPath, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const signedIn = await login(email.trim(), password);
      push(`Welcome back, ${signedIn.name}.`, "success");
      const destination = nextPath && nextPath.startsWith("/") ? nextPath : roleHome(signedIn.role);
      navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function useDemoAccount(account: (typeof demoAccounts)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setFieldErrors({});
    setFormError("");
  }

  return (
    <div className="content-width grid min-h-[calc(100vh-4.5rem)] items-center gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mt-6 lg:mt-0">
          <p className="eyebrow">Patient and staff access</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Sign in to book care, review your records, or open your clinical workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="relative mt-7 space-y-4 overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-soft">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-sky-400 to-rose-400" aria-hidden="true" />
          {formError ? (
            <Alert variant="error" title="Sign in failed" onDismiss={() => setFormError("")}>
              {formError}
            </Alert>
          ) : null}
          <Field label="Email address" htmlFor="login-email" error={fieldErrors.email} required>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              invalid={Boolean(fieldErrors.email)}
            />
          </Field>
          <Field label="Password" htmlFor="login-password" error={fieldErrors.password} required>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="pr-11"
                invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={submitting} icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
            {submitting ? "Signing in" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted">
            New patient?{" "}
            <Link to="/register" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
              Create a patient account
            </Link>
          </p>
        </form>

        <div className="mt-5 rounded-2xl border border-line bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Demo accounts</p>
          <p className="mt-1 text-xs leading-5 text-muted">Use a synthetic account to explore each role. The password is filled in for you.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {demoAccounts.map((account) => {
              const isPatient = account.role === "Patient";
              const isDoctor = account.role === "Doctor";
              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => useDemoAccount(account)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                    isPatient
                      ? "border-brand-100 bg-brand-50 text-brand-900 hover:bg-brand-100"
                      : isDoctor
                        ? "border-sky-100 bg-sky-50 text-sky-900 hover:bg-sky-100"
                        : "border-violet-100 bg-violet-50 text-violet-900 hover:bg-violet-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isPatient ? <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" /> : isDoctor ? <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" /> : <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span className="block text-[10px] uppercase tracking-wide opacity-80">{account.role}</span>
                  </span>
                  <span className="mt-1 block">{account.role === "Administrator" ? "Admin login" : account.role === "Doctor" ? "Doctor login" : "Patient login"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden rounded-[2rem] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-8 text-ink shadow-soft lg:block">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-100/60" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-rose-100/50 blur-2xl" aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-800">
            <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
            Connected outpatient care
          </span>
          <h2 className="mt-6 max-w-md font-display text-4xl font-semibold leading-tight">Every visit, clearly documented.</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            From the first booking to the final follow up note, your care team works from one reliable record.
          </p>
          <img src="/art/care-connection.svg" alt="" className="mx-auto mt-4 w-full max-w-md" />
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-brand-100 bg-white/80 p-3 text-center">
              <ShieldCheck className="mx-auto h-5 w-5 text-brand-700" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-semibold text-ink">Private records</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-white/80 p-3 text-center">
              <Stethoscope className="mx-auto h-5 w-5 text-sky-600" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-semibold text-ink">Clinic ready</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white/80 p-3 text-center">
              <LockKeyhole className="mx-auto h-5 w-5 text-violet-600" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-semibold text-ink">Role based access</p>
            </div>
          </div>
          <div className="mt-5 border-t border-brand-100 pt-4">
            <p className="text-xs leading-5 text-muted">Teaching project with synthetic data. Do not enter real patient information.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    address: "",
    blood_group: "Unknown",
    medical_history: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(roleHome(user.role), { replace: true });
  }, [user, navigate]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) errors.name = "Enter your full name.";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      errors.password = "Use at least 8 characters with one letter and one number.";
    }
    if (form.confirm_password !== form.password) errors.confirm_password = "Passwords do not match.";
    if (!form.date_of_birth) errors.date_of_birth = "Enter your date of birth.";
    else if (form.date_of_birth > new Date().toISOString().slice(0, 10)) errors.date_of_birth = "Date of birth cannot be in the future.";
    if (!form.gender) errors.gender = "Choose a gender option.";
    if (!/^\+?[0-9 ]{7,20}$/.test(form.phone.trim())) errors.phone = "Use 7 to 20 digits, spaces, or a leading plus sign.";
    return errors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        blood_group: form.blood_group,
        medical_history: form.medical_history.trim() || undefined,
      });
      push(`Your account is ready, ${created.name}.`, "success");
      navigate("/patient", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="content-width py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-rose-50 p-6 shadow-soft sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-100/60" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="eyebrow">New patient registration</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">Create your care account</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                One account keeps your appointments, test results, diagnosis, and treatment plans together. Use synthetic details for this teaching project.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Private
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                  <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
                  Connected
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                  Patient first
                </span>
              </div>
            </div>
            <img src="/art/care-connection.svg" alt="" className="hidden w-64 shrink-0 sm:block" />
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
          {formError ? (
            <div className="mb-5">
              <Alert variant="error" title="Registration could not be completed" onDismiss={() => setFormError("")}>
                {formError}
              </Alert>
            </div>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="register-name" error={fieldErrors.name} required>
              <Input id="register-name" value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" invalid={Boolean(fieldErrors.name)} />
            </Field>
            <Field label="Email address" htmlFor="register-email" error={fieldErrors.email} required>
              <Input id="register-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" invalid={Boolean(fieldErrors.email)} />
            </Field>
            <Field label="Password" htmlFor="register-password" error={fieldErrors.password} hint="At least 8 characters with one letter and one number." required>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  autoComplete="new-password"
                  className="pr-11"
                  invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" htmlFor="register-confirm" error={fieldErrors.confirm_password} required>
              <Input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                value={form.confirm_password}
                onChange={(event) => update("confirm_password", event.target.value)}
                autoComplete="new-password"
                invalid={Boolean(fieldErrors.confirm_password)}
              />
            </Field>
            <Field label="Date of birth" htmlFor="register-dob" error={fieldErrors.date_of_birth} required>
              <Input id="register-dob" type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={(event) => update("date_of_birth", event.target.value)} invalid={Boolean(fieldErrors.date_of_birth)} />
            </Field>
            <Field label="Gender" htmlFor="register-gender" error={fieldErrors.gender} required>
              <select
                id="register-gender"
                value={form.gender}
                onChange={(event) => update("gender", event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                aria-invalid={Boolean(fieldErrors.gender) || undefined}
              >
                <option value="">Choose an option</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </Field>
            <Field label="Phone number" htmlFor="register-phone" error={fieldErrors.phone} hint="Include the country code if you wish." required>
              <Input id="register-phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" placeholder="+91 90000 11005" invalid={Boolean(fieldErrors.phone)} />
            </Field>
            <Field label="Blood group" htmlFor="register-blood" error={fieldErrors.blood_group} hint="Optional. Choose Unknown if you are unsure.">
              <select
                id="register-blood"
                value={form.blood_group}
                onChange={(event) => update("blood_group", event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              >
                <option>Unknown</option>
                <option>A positive</option>
                <option>A negative</option>
                <option>B positive</option>
                <option>B negative</option>
                <option>AB positive</option>
                <option>AB negative</option>
                <option>O positive</option>
                <option>O negative</option>
              </select>
            </Field>
            <Field label="Address" htmlFor="register-address" error={fieldErrors.address} className="sm:col-span-2" hint="Optional. Used by reception to reach you if needed.">
              <Input id="register-address" value={form.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" invalid={Boolean(fieldErrors.address)} />
            </Field>
            <Field label="Medical history" htmlFor="register-history" error={fieldErrors.medical_history} className="sm:col-span-2" hint="Optional. Share allergies or long term conditions that your doctor should know.">
              <textarea
                id="register-history"
                value={form.medical_history}
                onChange={(event) => update("medical_history", event.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              ></textarea>
            </Field>
          </div>
          <div className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-xs leading-5 text-brand-900">
            By creating an account you agree to keep this demonstration record free of real patient information. The hospital team can update clinical details during your visit.
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" loading={submitting} icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
            {submitting ? "Creating your account" : "Create patient account"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-brand-700 underline-offset-2 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
