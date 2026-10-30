import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, ApiError, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Field, Input } from "../components/Form";
import { PageHeader } from "../components/PageHeader";
import { PageLoading } from "../components/Skeleton";

interface SetupStatus {
  setup_required: boolean;
  setup_completed: boolean;
  setup_available: boolean;
  admin_exists: boolean;
}

interface SetupForm {
  email: string;
  password: string;
  confirm_password: string;
  setup_secret: string;
}

const emptyForm: SetupForm = {
  email: "",
  password: "",
  confirm_password: "",
  setup_secret: "",
};

export function SetupPage() {
  const { setupAdmin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [form, setForm] = useState<SetupForm>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<SetupStatus>("/auth/setup-status")
      .then((response) => {
        if (active) setStatus(response);
      })
      .catch((error) => {
        if (active) setStatusError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  function update(field: keyof SetupForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.email.trim()) errors.email = "Email is required.";
    if (form.password.length < 8) errors.password = "Use at least 8 characters.";
    if (form.password !== form.confirm_password) {
      errors.confirm_password = "Passwords do not match.";
    }
    if (!form.setup_secret) errors.setup_secret = "Setup secret is required.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await setupAdmin({
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
        setup_secret: form.setup_secret,
      });
      navigate("/admin", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFieldErrors(error.fields);
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (statusError) {
    return (
      <div className="content-width py-12">
        <Alert variant="error" title="Setup status unavailable">
          {statusError}
        </Alert>
      </div>
    );
  }

  if (!status) {
    return <PageLoading label="Checking administrator setup" />;
  }

  if (status.setup_completed) {
    return (
      <div className="content-width py-12">
        <PageHeader
          eyebrow="Administrator access"
          title="Setup is already complete"
          description="An administrator account exists. Sign in with the credentials issued by the hospital."
          showBack={false}
        />
        <div className="max-w-xl rounded-xl2 border border-line bg-white p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="text-sm leading-6 text-muted">
                First time setup cannot be repeated. Use the administrator security page after signing in to change
                the sign in email or password.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Go to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-width py-12">
      <PageHeader
        eyebrow="Administrator access"
        title="First time administrator setup"
        description="Create the only initial administrator account. This page closes permanently after setup succeeds."
        showBack={false}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl2 border border-line bg-white p-6 shadow-soft"
        >
          {formError ? (
            <Alert variant="error" title="Setup failed" onDismiss={() => setFormError("")}>
              {formError}
            </Alert>
          ) : null}
          {!status.setup_available ? (
            <Alert variant="warning" title="Setup is not configured">
              The backend environment is missing ADMIN_SETUP_SECRET. Set it to a long random value, restart the
              backend, then reload this page.
            </Alert>
          ) : null}

          <div className="mt-4 space-y-4">
            <Field label="Administrator email" htmlFor="setup-email" error={fieldErrors.email} required>
              <Input
                id="setup-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="administrator@example.com"
                invalid={Boolean(fieldErrors.email)}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="setup-password"
              error={fieldErrors.password}
              hint="Use at least 8 characters with a letter and a number."
              required
            >
              <Input
                id="setup-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                invalid={Boolean(fieldErrors.password)}
              />
            </Field>
            <Field
              label="Confirm new password"
              htmlFor="setup-confirm-password"
              error={fieldErrors.confirm_password}
              required
            >
              <Input
                id="setup-confirm-password"
                type="password"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={(event) => update("confirm_password", event.target.value)}
                invalid={Boolean(fieldErrors.confirm_password)}
              />
            </Field>
            <Field
              label="Setup secret"
              htmlFor="setup-secret"
              error={fieldErrors.setup_secret}
              hint="This is the ADMIN_SETUP_SECRET value configured on the backend."
              required
            >
              <Input
                id="setup-secret"
                type="password"
                autoComplete="off"
                value={form.setup_secret}
                onChange={(event) => update("setup_secret", event.target.value)}
                invalid={Boolean(fieldErrors.setup_secret)}
              />
            </Field>
          </div>

          <Button
            type="submit"
            className="mt-5 w-full"
            size="lg"
            loading={submitting}
            disabled={!status.setup_available}
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          >
            {submitting ? "Creating administrator" : "Create administrator"}
          </Button>
        </form>

        <aside className="rounded-xl2 border border-brand-100 bg-brand-50/60 p-6">
          <ShieldCheck className="h-8 w-8 text-brand-700" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl font-semibold text-ink">Before you begin</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            <li>The setup secret must be set in the backend environment as ADMIN_SETUP_SECRET.</li>
            <li>Choose a unique password. Do not reuse the demonstration passwords from the seed data.</li>
            <li>This setup can run only once. Later credential changes happen from the administrator security page.</li>
            <li>After success, you are signed in and can manage doctors, departments, schedules, and appointments.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
