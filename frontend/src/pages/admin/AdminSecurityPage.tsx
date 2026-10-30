import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { api, ApiError, errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { SecuritySettings, SecuritySettingsResponse } from "../../types";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { SectionCard } from "../../components/Card";
import { Field, Input } from "../../components/Form";
import { PageHeader } from "../../components/PageHeader";
import { PageLoading } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";

export function AdminSecurityPage() {
  const { refresh, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<SecuritySettingsResponse>("/admin/security")
      .then((response) => {
        if (!active) return;
        setSecurity(response.security);
        setEmail(response.security.email);
      })
      .catch((error) => {
        if (active) setLoadError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Email is required.";
    if (!emailPassword) errors.current_password = "Current password is required.";
    setEmailErrors(errors);
    setEmailError("");
    if (Object.keys(errors).length > 0) return;

    setEmailSaving(true);
    try {
      const response = await api.patch<{ user: { email: string }; message: string }>(
        "/admin/security/email",
        { email: email.trim(), current_password: emailPassword },
      );
      setSecurity((current) => (current ? { ...current, email: response.user.email } : current));
      setEmailPassword("");
      await refresh();
      push("Sign in email updated.", "success");
    } catch (error) {
      if (error instanceof ApiError && error.fields) setEmailErrors(error.fields);
      setEmailError(errorMessage(error));
    } finally {
      setEmailSaving(false);
    }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current_password = "Current password is required.";
    if (newPassword.length < 8) errors.new_password = "Use at least 8 characters.";
    if (newPassword !== confirmPassword) errors.confirm_password = "Passwords do not match.";
    setPasswordErrors(errors);
    setPasswordError("");
    if (Object.keys(errors).length > 0) return;

    setPasswordSaving(true);
    try {
      await api.post("/admin/security/password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      push("Password changed. Sign in again with the new password.", "success");
      await logout();
      navigate("/login?notice=password-changed", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setPasswordErrors(error.fields);
      setPasswordError(errorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loadError) {
    return (
      <div>
        <PageHeader title="Security settings" description="Manage the administrator sign in credentials." />
        <Alert variant="error" title="Could not load security settings">
          {loadError}
        </Alert>
      </div>
    );
  }

  if (!security) {
    return <PageLoading label="Loading security settings" />;
  }

  return (
    <div>
      <PageHeader
        title="Security settings"
        description="Change the administrator sign in email or password. Password changes end every active session."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Sign in email"
          description="Use this email the next time you sign in."
          action={<Mail className="h-5 w-5 text-brand-700" aria-hidden="true" />}
        >
          <form onSubmit={submitEmail} noValidate className="space-y-4">
            {emailError ? (
              <Alert variant="error" title="Email change failed" onDismiss={() => setEmailError("")}>
                {emailError}
              </Alert>
            ) : null}
            <Field label="Email address" htmlFor="security-email" error={emailErrors.email} required>
              <Input
                id="security-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                invalid={Boolean(emailErrors.email)}
              />
            </Field>
            <Field
              label="Current password"
              htmlFor="security-email-password"
              error={emailErrors.current_password}
              hint="Required to confirm this change."
              required
            >
              <Input
                id="security-email-password"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                invalid={Boolean(emailErrors.current_password)}
              />
            </Field>
            <Button type="submit" loading={emailSaving} icon={<Mail className="h-4 w-4" aria-hidden="true" />}>
              {emailSaving ? "Updating email" : "Update email"}
            </Button>
          </form>
        </SectionCard>

        <SectionCard
          title="Password"
          description="Choose a password you have not used for this account before."
          action={<KeyRound className="h-5 w-5 text-brand-700" aria-hidden="true" />}
        >
          <form onSubmit={submitPassword} noValidate className="space-y-4">
            {passwordError ? (
              <Alert variant="error" title="Password change failed" onDismiss={() => setPasswordError("")}>
                {passwordError}
              </Alert>
            ) : null}
            <Field
              label="Current password"
              htmlFor="security-current-password"
              error={passwordErrors.current_password}
              required
            >
              <Input
                id="security-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                invalid={Boolean(passwordErrors.current_password)}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="security-new-password"
              error={passwordErrors.new_password}
              hint="Use at least 8 characters with a letter and a number."
              required
            >
              <Input
                id="security-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                invalid={Boolean(passwordErrors.new_password)}
              />
            </Field>
            <Field
              label="Confirm new password"
              htmlFor="security-confirm-password"
              error={passwordErrors.confirm_password}
              required
            >
              <Input
                id="security-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                invalid={Boolean(passwordErrors.confirm_password)}
              />
            </Field>
            <Button
              type="submit"
              loading={passwordSaving}
              icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            >
              {passwordSaving ? "Changing password" : "Change password"}
            </Button>
            <p className="text-xs leading-5 text-muted">
              After a successful password change, all sessions end and you must sign in again.
            </p>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
