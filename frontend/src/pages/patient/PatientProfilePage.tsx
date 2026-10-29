import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { api, ApiError, errorMessage } from "../../api/client";
import type { ProfileResponse } from "../../types";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { SectionCard } from "../../components/Card";
import { Field, Input, Select, Textarea } from "../../components/Form";
import { PageHeader } from "../../components/PageHeader";
import { PageLoading } from "../../components/Skeleton";
import { todayISO } from "../../utils/format";

interface ProfileForm {
  name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string;
  blood_group: string;
  medical_history: string;
}

const emptyForm: ProfileForm = {
  name: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  address: "",
  blood_group: "Unknown",
  medical_history: "",
};

export function PatientProfilePage() {
  const state = useApi<ProfileResponse>("/patients/me");
  const { refresh } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [initial, setInitial] = useState<ProfileForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state.data?.patient) return;
    const patient = state.data.patient;
    const next: ProfileForm = {
      name: patient.name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      phone: patient.phone,
      address: patient.address ?? "",
      blood_group: patient.blood_group,
      medical_history: patient.medical_history ?? "",
    };
    setForm(next);
    setInitial(next);
  }, [state.data]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  const email = state.data?.patient.email;

  function update(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess(false);
  }

  function reset() {
    setForm(initial);
    setFieldErrors({});
    setFormError("");
    setSuccess(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) errors.name = "Enter your full name.";
    if (!form.date_of_birth) errors.date_of_birth = "Enter your date of birth.";
    else if (form.date_of_birth > todayISO()) errors.date_of_birth = "Date of birth cannot be in the future.";
    if (!form.gender) errors.gender = "Choose a gender option.";
    if (!/^\+?[0-9 ]{7,20}$/.test(form.phone.trim())) errors.phone = "Use 7 to 20 digits, spaces, or a leading plus sign.";
    setFieldErrors(errors);
    setFormError("");
    setSuccess(false);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const response = await api.patch<{ message: string; patient: ProfileResponse["patient"] }>("/patients/me", {
        name: form.name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        phone: form.phone.trim(),
        address: form.address.trim(),
        blood_group: form.blood_group,
        medical_history: form.medical_history.trim(),
      });
      setInitial({ ...form, name: response.patient.name, address: response.patient.address ?? "", medical_history: response.patient.medical_history ?? "" });
      setSuccess(true);
      push("Profile updated.", "success");
      state.reload();
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (state.loading) return <PageLoading label="Loading your profile" />;

  return (
    <div>
      <PageHeader
        eyebrow="Profile"
        title="Your personal details"
        description="Keep your contact information and medical history current for safer outpatient care."
      />

      {state.error ? (
        <Alert variant="error" title="Profile could not load">
          <p>{state.error}</p>
          <button type="button" onClick={state.reload} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <SectionCard title="Patient information" description="Changes are saved to your hospital record immediately.">
            <form onSubmit={handleSubmit} noValidate>
              {formError ? (
                <div className="mb-5">
                  <Alert variant="error" title="Profile could not be updated" onDismiss={() => setFormError("")}>{formError}</Alert>
                </div>
              ) : null}
              {success ? (
                <div className="mb-5">
                  <Alert variant="success" title="Profile updated" onDismiss={() => setSuccess(false)}>
                    Your contact details and medical history are up to date.
                  </Alert>
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" htmlFor="profile-name" error={fieldErrors.name} required>
                  <Input id="profile-name" value={form.name} onChange={(event) => update("name", event.target.value)} invalid={Boolean(fieldErrors.name)} />
                </Field>
                <Field label="Email address" htmlFor="profile-email" hint="Email is your sign in name and cannot be changed here.">
                  <Input id="profile-email" value={email ?? ""} readOnly disabled />
                </Field>
                <Field label="Date of birth" htmlFor="profile-dob" error={fieldErrors.date_of_birth} required>
                  <Input id="profile-dob" type="date" max={todayISO()} value={form.date_of_birth} onChange={(event) => update("date_of_birth", event.target.value)} invalid={Boolean(fieldErrors.date_of_birth)} />
                </Field>
                <Field label="Gender" htmlFor="profile-gender" error={fieldErrors.gender} required>
                  <Select id="profile-gender" value={form.gender} onChange={(event) => update("gender", event.target.value)} invalid={Boolean(fieldErrors.gender)}>
                    <option value="">Choose an option</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </Select>
                </Field>
                <Field label="Phone number" htmlFor="profile-phone" error={fieldErrors.phone} required>
                  <Input id="profile-phone" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} invalid={Boolean(fieldErrors.phone)} />
                </Field>
                <Field label="Blood group" htmlFor="profile-blood" error={fieldErrors.blood_group}>
                  <Select id="profile-blood" value={form.blood_group} onChange={(event) => update("blood_group", event.target.value)} invalid={Boolean(fieldErrors.blood_group)}>
                    <option>Unknown</option>
                    <option>A positive</option>
                    <option>A negative</option>
                    <option>B positive</option>
                    <option>B negative</option>
                    <option>AB positive</option>
                    <option>AB negative</option>
                    <option>O positive</option>
                    <option>O negative</option>
                  </Select>
                </Field>
                <Field label="Address" htmlFor="profile-address" error={fieldErrors.address} className="sm:col-span-2">
                  <Input id="profile-address" value={form.address} onChange={(event) => update("address", event.target.value)} invalid={Boolean(fieldErrors.address)} />
                </Field>
                <Field label="Medical history" htmlFor="profile-history" error={fieldErrors.medical_history} className="sm:col-span-2" hint="Share allergies, long term conditions, or regular medicines that your care team should know.">
                  <Textarea id="profile-history" value={form.medical_history} onChange={(event) => update("medical_history", event.target.value)} invalid={Boolean(fieldErrors.medical_history)} />
                </Field>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={reset} disabled={!dirty || saving} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
                  Reset changes
                </Button>
                <Button type="submit" loading={saving} disabled={!dirty} icon={<Save className="h-4 w-4" aria-hidden="true" />}>
                  {saving ? "Saving profile" : "Save changes"}
                </Button>
              </div>
              {!dirty ? <p className="mt-2 text-right text-xs text-muted">There are no unsaved changes.</p> : null}
            </form>
          </SectionCard>

          <div className="space-y-4">
            <div className="rounded-xl2 border border-line bg-brand-800 p-5 text-white shadow-soft">
              <ShieldCheck className="h-6 w-6 text-brand-200" aria-hidden="true" />
              <h2 className="mt-3 font-display text-xl font-semibold">Your privacy</h2>
              <p className="mt-2 text-sm leading-6 text-brand-100">
                Your patient record is visible only to you, your treating doctor, and the hospital administrator for care coordination.
              </p>
            </div>
            <div className="rounded-xl2 border border-line bg-white p-5 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-ink">Account details</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Sign in email</dt>
                  <dd className="mt-1 break-all font-medium text-ink">{email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Patient record</dt>
                  <dd className="mt-1 font-medium text-ink">#{state.data?.patient.patient_id}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-muted">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                Contact reception if your legal name or date of birth needs correction.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
