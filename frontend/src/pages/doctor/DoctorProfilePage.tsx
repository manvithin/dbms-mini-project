import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Phone, Stethoscope } from "lucide-react";
import { api, ApiError, errorMessage } from "../../api/client";
import type { Doctor, DoctorProfileResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { SectionCard } from "../../components/Card";
import { Field, Input } from "../../components/Form";
import { PageHeader } from "../../components/PageHeader";
import { PageLoading } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";

export function DoctorProfilePage() {
  const { push } = useToast();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadError, setLoadError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<DoctorProfileResponse>("/doctor/profile")
      .then((response) => {
        if (!active) return;
        setDoctor(response.doctor);
        setPhone(response.doctor.phone);
      })
      .catch((error) => {
        if (active) setLoadError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!phone.trim()) {
      setFieldErrors({ phone: "Phone number is required." });
      return;
    }
    setFieldErrors({});
    setFormError("");
    setSaving(true);
    try {
      const response = await api.patch<{ doctor: Doctor; message: string }>("/doctor/profile", {
        phone: phone.trim(),
      });
      setDoctor(response.doctor);
      setPhone(response.doctor.phone);
      push("Contact details updated.", "success");
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");
    setSaving(true);
    try {
      await api.post<{ user: any; message: string }>("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      push("Password changed successfully.", "success");
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <PageHeader title="My profile" description="Your doctor account and contact details." />
        <Alert variant="error" title="Could not load your profile">
          {loadError}
        </Alert>
      </div>
    );
  }

  if (!doctor) {
    return <PageLoading label="Loading your profile" />;
  }

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Review your doctor record and keep your contact number current."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Doctor record"
          description="Administrative details are managed by the hospital administrator."
          action={<Stethoscope className="h-5 w-5 text-brand-700" aria-hidden="true" />}
        >
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-muted">Name</dt>
              <dd className="mt-1 text-ink">{doctor.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Specialization</dt>
              <dd className="mt-1 text-ink">{doctor.specialization}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Department</dt>
              <dd className="mt-1 text-ink">{doctor.department_name ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Sign in email</dt>
              <dd className="mt-1 text-ink">{doctor.email ?? "No account linked"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Account status</dt>
              <dd className="mt-1 text-ink">{doctor.account_active ? "Active" : "Inactive"}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Contact number"
          description="This is the only doctor detail you can change here."
          action={<Phone className="h-5 w-5 text-brand-700" aria-hidden="true" />}
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError ? (
              <Alert variant="error" title="Update failed" onDismiss={() => setFormError("")}>
                {formError}
              </Alert>
            ) : null}
            <Field
              label="Phone number"
              htmlFor="doctor-phone"
              error={fieldErrors.phone}
              hint="Use 7 to 20 digits with an optional leading plus sign."
              required
            >
              <Input
                id="doctor-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                invalid={Boolean(fieldErrors.phone)}
              />
            </Field>
            <Button type="submit" loading={saving} icon={<Phone className="h-4 w-4" aria-hidden="true" />}>
              {saving ? "Saving contact number" : "Save contact number"}
            </Button>
            <p className="text-xs leading-5 text-muted">
              Name, specialization, department, email, and account status can only be changed by an administrator.
            </p>
          </form>
        </SectionCard>

        <SectionCard
          title="Change password"
          description="Update your sign-in password."
          action={<KeyRound className="h-5 w-5 text-brand-700" aria-hidden="true" />}
        >
          <form onSubmit={handlePasswordChange} noValidate className="space-y-4">
            {formError ? (
              <Alert variant="error" title="Password change failed" onDismiss={() => setFormError("")}>
                {formError}
              </Alert>
            ) : null}
            <Field
              label="Current password"
              htmlFor="change-current-password"
              error={fieldErrors.current_password}
              hint="Enter your current password."
              required
            >
              <Input
                id="change-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                invalid={Boolean(fieldErrors.current_password)}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="change-new-password"
              error={fieldErrors.new_password}
              hint="At least 8 characters with one letter and one number."
              required
            >
              <Input
                id="change-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                invalid={Boolean(fieldErrors.new_password)}
              />
            </Field>
            <Field
              label="Confirm new password"
              htmlFor="change-confirm-password"
              error={fieldErrors.confirm_password}
              hint="Enter the same password as above."
              required
            >
              <Input
                id="change-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                invalid={Boolean(fieldErrors.confirm_password)}
              />
            </Field>
            <Button type="submit" loading={saving} icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
              {saving ? "Changing password" : "Change password"}
            </Button>
          </form>
          <p className="text-xs leading-5 text-muted">
            Admins can also reset passwords from the administrator security page.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
