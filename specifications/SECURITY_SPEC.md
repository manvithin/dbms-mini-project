# Security and Privacy Specification

This is an educational demonstration. Do not use real patient records or describe the app as clinically validated.

This document states the security rules for the project and records how each rule is implemented. The implementation was checked with the backend security tests listed in [../Test_Report.md](../Test_Report.md) and the manual browser checks described there.

## 1. Scope and threat model

The system has three roles: patient, doctor, and administrator. The assets that matter are:

* Patient demographic and clinical records.
* Doctor records and schedules.
* Administrator credentials.
* The signed session cookie and the CSRF token.

The main threats considered are:

* A signed out visitor calling a protected API route.
* A patient or doctor calling an administrator route.
* A patient reading another patient record.
* A doctor reading or changing another doctor record.
* A user trying to set `role`, `patient_id`, `doctor_id`, or `is_active` in a request body.
* Cross site request forgery against a signed in browser.
* A stolen session that stays valid after a password change.
* A public administrator password left in a seed file, the frontend, or the documentation.
* A second first time setup after the real administrator exists.

Out of scope: multi factor authentication, account lockout, rate limiting, virus scanning, and enterprise audit retention. These are stated as limits, not as hidden claims.

## 2. Passwords

Rules:

* Hash passwords with a recognised library.
* Never store, log, or return a plain text password.
* Never return a password hash from the API.
* Require at least eight characters with at least one letter and one number.

Implementation:

* `generate_password_hash(password, method="pbkdf2:sha256:600000")` from Werkzeug.
* `check_password_hash()` verifies a login.
* `validate_password()` enforces length and composition.
* `serialize_user()` never includes `password_hash`.
* No route logs a request body.
* The seed file contains synthetic doctor and patient passwords for the demonstration. It contains no administrator account and no administrator password.

## 3. First time administrator setup

Rules:

* Do not ship a public administrator password.
* Require an environment secret for the first administrator.
* Close setup permanently after success.
* Do not delete clinical data when rotating an administrator.

Implementation:

* `ADMIN_SETUP_SECRET` must be at least 16 characters. It is read from the backend environment and is never committed.
* `POST /api/auth/setup-admin` checks `setup_completed()`, then compares the supplied secret with `hmac.compare_digest`.
* A missing or short secret returns `503 setup_unavailable`.
* A wrong secret returns `403 invalid_setup_secret`.
* A successful setup hashes the password, creates one `admin` account, and writes the `admin_setup_completed` marker to `system_setting` in the same transaction.
* Any later setup attempt returns `409 setup_completed`, even if the administrator row is later deleted.
* `flask setup-admin` follows the same rules. `--rotate` changes the existing administrator password in place and leaves every doctor, patient, appointment, test, diagnosis, and prescription untouched.
* The generated password is printed once by the CLI. It is not written to the database, the repository, or the documentation.

The seed and reset commands remove the administrator account and the setup marker. Run `flask setup-admin` again after a local reset. Never run `flask reset-demo` against the production database.

## 4. Administrator credential changes

Rules:

* Require the current password before an email or password change.
* Confirm the new password.
* Reject the old password after a change.
* End existing sessions after a password change.

Implementation:

* `PATCH /api/admin/security/email` requires `current_password` and `email`. It validates the email and rejects a duplicate.
* `POST /api/admin/security/password` requires `current_password`, `new_password`, and `confirm_password`.
* A wrong current password returns `400 invalid_current_password`.
* A mismatched confirmation returns `400 validation_error`.
* Reusing the current password returns `400 same_password`.
* The new hash is written to the existing account row. The current session is cleared and the page asks for a new sign in.
* The session stores a SHA256 fingerprint of the password hash. `get_current_user()` compares that fingerprint with the current database hash on every authenticated request. A password change therefore invalidates every other session on its next request.

The old password stops working immediately because the stored hash no longer matches it. There is no separate server side session revocation list. The fingerprint is the revocation mechanism.

## 5. Sessions and cookies

Rules:

* Use a signed, HTTP only session cookie.
* Apply a session lifetime.
* Mark the cookie `Secure` in production.
* Use `SameSite=Lax`.
* Start a fresh session at sign in.

Implementation:

* Flask signed session cookie named `hospital_session`.
* `SESSION_COOKIE_HTTPONLY = True`.
* `SESSION_COOKIE_SAMESITE` defaults to `Lax`.
* `SESSION_COOKIE_SECURE` defaults to false for local HTTP and must be `true` in production.
* `PERMANENT_SESSION_LIFETIME` defaults to eight hours through `SESSION_HOURS`.
* `start_session()` clears the old session, stores `user_id` and the credential fingerprint, marks the session permanent, and rotates the CSRF token.
* `logout()` clears the session and issues a new CSRF token.

The cookie is signed to prevent tampering, not encrypted. It contains the user identifier and security metadata, not the password or clinical data.

## 6. Cross site request forgery

Rules:

* Require a session bound token on every state changing request.
* Do not rely on `SameSite` alone.
* Keep the token out of URLs and logs.

Implementation:

* `GET /api/auth/csrf` returns `{"csrf_token": "..."}` for the current session.
* `csrf_protect()` is registered with `before_request`. It skips safe methods and non API paths, then compares `X-CSRF-Token` with the session token using `hmac.compare_digest`.
* A missing or wrong token returns `403 csrf_failed` with a safe message.
* The frontend fetches the token, sends it on `POST`, `PUT`, `PATCH`, and `DELETE`, and retries once after a fresh token if the backend rejects it.
* Sign in, setup, logout, and `/auth/me` return a new token so the client stays in sync.
* `CSRF_ENABLED` defaults to true. Tests may disable it only through an explicit test configuration, and the security suite keeps it enabled.

## 7. Role and record access

Rules:

* Patients access only their own records.
* Doctors access only assigned appointments and their own doctor record.
* Doctors may update only their own phone number in the self profile.
* Administrators manage permitted system data but do not write clinical records.
* Enforce every rule in the backend. Frontend guards are only a usability layer.
* Never trust a role, account link, or active flag supplied by the client.

Implementation:

* `login_required` checks the session and the active flag.
* `role_required("patient")`, `role_required("doctor")`, and `role_required("admin")` read the role from the database.
* Patient routes filter by `user.patient_id`.
* Doctor routes filter by `user.doctor_id`. A doctor who guesses another appointment identifier receives `404`.
* `GET` and `PATCH /api/doctor/profile` use `user.doctor_id`. The patch accepts only `phone`.
* Administrator routes that accept a request body use `role_required("admin")` and `reject_forbidden_fields()`.
* `reject_forbidden_fields()` rejects `role`, `user_id`, `patient_id`, `doctor_id`, `is_active`, `username`, and `password_hash` where those fields are not allowed. A rejected payload returns `400 forbidden_field` before any write.
* Administrator accounts cannot be linked to a patient or doctor row because of the `user_account` check constraint.

The 13 requested permission cases are covered in `backend/tests/test_security.py`. They include signed out access, wrong role access, doctor to doctor access, administrator success, invalid credentials, invalid setup secret, setup after an administrator exists, password change, old password rejection, new password acceptance, and role change rejection.

## 8. Input, output, and database access

Rules:

* Validate types, lengths, required fields, dates, identifiers, and allowed status values.
* Use ORM parameterisation.
* Avoid unsafe dynamic SQL.
* Limit request sizes.
* Return safe server errors.
* Escape untrusted content when rendered.

Implementation:

* `validation.py` provides `json_body()`, `required_text()`, `optional_text()`, `parse_int()`, `parse_date()`, `parse_time()`, `parse_bool()`, `parse_enum()`, `validate_email()`, `validate_phone()`, `validate_name()`, and `validate_password()`.
* SQLAlchemy ORM queries use bound parameters.
* The only raw SQL is the controlled `sp_book_appointment` call and the fixed table list used by the local reset command.
* `MAX_CONTENT_LENGTH` limits request bodies to one megabyte.
* `ApiError` produces `{"error": {"code": ..., "message": ...}}` with no stack trace.
* React renders text through JSX escaping. The app does not use `dangerouslySetInnerHTML`.
* Database constraints back up application checks: foreign keys, unique keys, check constraints, and the generated `slot_active` column.

## 9. Security headers and transport

The API sets these response headers:

* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: DENY`
* `Referrer-Policy: same-origin`
* `Permissions-Policy: camera=(), microphone=(), geolocation=()`
* `Cache-Control: no-store` for JSON responses

HTTPS is terminated by Vercel and Render in the deployed demonstration. Production must set `SESSION_COOKIE_SECURE=true`. The application does not set a Content Security Policy or an HTTP Strict Transport Security header itself. This is a known limit and is recorded in the README and the deployment guide.

## 10. Configuration and secrets

Rules:

* Provide an environment example file with placeholders.
* Ignore real environment files, secrets, local databases, build output, and virtual environments.

Implementation:

* `backend/.env.example` lists `SECRET_KEY`, `DATABASE_URL`, `TEST_DATABASE_URL`, `CORS_ORIGINS`, `APP_TIMEZONE`, `SESSION_HOURS`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SAMESITE`, `SESSION_COOKIE_SECURE`, `CSRF_ENABLED`, and `ADMIN_SETUP_SECRET` with placeholder values.
* `.gitignore` excludes `.env`, `.env.*` except `.env.example`, virtual environments, `node_modules`, build output, coverage, and logs.
* `CORS_ORIGINS` is an exact origin list. A wildcard is not used because requests carry credentials.
* Production secrets belong in the Render environment, not in Git.
* The live deployment must rotate the production administrator password after the new backend is deployed. The local rotation does not change Aiven.

## 11. Audit and error handling

Rules:

* Log useful operational events without passwords, session secrets, or unnecessary patient details.
* Keep stack traces in development logs only.

Implementation:

* The `appointment_status_history` table is the clinical audit trail. A database trigger writes every status change.
* Flask logs request method, path, status, and duration. Request bodies and passwords are not logged.
* Error handlers return safe JSON messages.
* The test report records the observed `400` and `401` responses from the manual browser checks and states that the backend log showed no server errors.

## 12. Required security tests

The following cases are covered by `backend/tests/test_security.py`:

1. A signed out doctor update returns `401`.
2. A patient doctor update returns `403`.
3. A doctor updating another doctor returns `403`.
4. A doctor on an administrator endpoint returns `403`.
5. A patient on an administrator endpoint returns `403`.
6. An administrator doctor update succeeds.
7. Invalid administrator credentials return `401`.
8. An invalid setup secret returns `403`.
9. Setup after an administrator exists returns `409`.
10. First time setup creates one administrator and closes setup.
11. The setup marker stays closed after the administrator row is removed.
12. An administrator password change requires the current password.
13. An administrator password change invalidates the session, rejects the old password, and accepts the new password.
14. An administrator can change the sign in email.
15. Forbidden role fields are rejected.
16. A doctor can view and update only the own contact details.
17. A patient cannot open a doctor profile.
18. A state changing request without a CSRF token returns `403 csrf_failed`.
19. The session cookie is `HttpOnly` and `SameSite=Lax`.
20. Logout invalidates the session.
21. The setup CLI creates a hashed administrator.
22. The setup CLI rotates in place without deleting clinical data.

The full command, result, and environment are in [../Test_Report.md](../Test_Report.md).

## 13. Known limits

* No multi factor authentication, rate limiting, or account lockout.
* No separate server side session revocation list. Password changes invalidate sessions through the credential fingerprint.
* No Content Security Policy or HTTP Strict Transport Security header from the application.
* The free Render service spins down after inactivity, so the first request can take about one minute.
* The free Aiven MySQL service has a 76 connection limit and can power off after inactivity.
* The production administrator password must be rotated after deployment. The live site is not treated as fixed until the new frontend is deployed and the production password is rotated.
* No formal penetration test or accessibility audit was run.
* The project does not claim zero defects. The documented workflows pass, and the limits above remain.
