# Code Walkthrough

This guide explains how the project is organised and how a request moves through the code. It is intended for a student preparing a viva or for a reviewer who wants to understand the implementation quickly.

## 1. Start here

Read the project in this order:

1. `backend/app/models.py` for the data model.
2. `backend/app/db_objects.py` for the trigger and booking procedure.
3. `backend/app/services/availability.py` for slot and status rules.
4. `backend/app/appointments.py` for the patient workflow.
5. `backend/app/doctor.py` for the clinical workflow.
6. `backend/app/admin.py` for management.
7. `frontend/src/App.tsx` for the route map.
8. `frontend/src/pages/` for the screens.

## 2. Application startup

### Backend

`backend/run.py` calls `create_app()` and starts Flask on `127.0.0.1:5000`.

`backend/app/__init__.py` contains the application factory. It:

* Loads `Config`.
* Applies test overrides when supplied.
* Initialises SQLAlchemy, Flask Migrate, and CORS.
* Registers the error handlers.
* Registers seven blueprints.
* Adds security headers.
* Registers CLI commands.

The blueprints are:

| Blueprint | Prefix | Main area |
| --- | --- | --- |
| `auth_bp` | `/api/auth` | Registration, login, logout, current user, first time setup, CSRF token |
| `public_bp` | `/api` | Departments, doctors, availability |
| `patient_bp` | `/api/patients` | Patient profile and own records |
| `appointment_bp` | `/api/appointments` | Booking, detail, cancellation |
| `doctor_bp` | `/api/doctor` | Doctor summary, assigned appointments, self profile |
| `clinical_bp` | `/api` | Tests, results, diagnosis, prescription |
| `admin_bp` | `/api/admin` | Management, security settings, doctor profile administration |

### Frontend

`frontend/src/main.tsx` mounts the React application. `App.tsx` defines the routes. `AuthProvider` wraps the application so every page can read the current user.

Vite proxies `/api` to `http://127.0.0.1:5000`, so the browser and API share an origin during development. This also lets the session cookie work without cross site complications.

## 3. Request lifecycle: booking an appointment

This is the most important flow to understand.

### Step 1: The page loads options

`frontend/src/pages/patient/BookAppointmentPage.tsx` uses `useApi` to load:

* `/departments`
* `/doctors`
* `/doctors/{id}/availability?date=...`

The availability request returns only open slots.

### Step 2: The patient submits the form

The page calls:

```text
POST /api/appointments
```

with:

```json
{
  "doctor_id": 1,
  "appointment_date": "2026-10-30",
  "appointment_time": "09:00",
  "reason_for_visit": "Persistent cough for five days."
}
```

### Step 3: The backend validates the request

`backend/app/appointments.py`:

1. Checks that the user is a patient.
2. Parses the doctor identifier, date, time, and reason.
3. Loads the doctor and checks that the doctor is active.
4. Checks that the reason fits the doctor specialty with `reason_guidance.py`.
5. Rejects a past date.
6. Recalculates availability and rejects a slot that is no longer open.
7. Calls `db.session.rollback()` to end the read transaction.
8. Calls `book_appointment()` in `backend/app/services/booking.py`.

### Step 4: The stored procedure owns the write

`book_appointment()` opens a raw PyMySQL connection and runs:

```sql
CALL sp_book_appointment(%s, %s, %s, %s, %s, @appointment_id, @message);
SELECT @appointment_id, @message;
```

The procedure locks the doctor row, repeats the slot checks, inserts the appointment, and commits. The service translates the output message into an `ApiError` when needed.

### Step 5: The session is refreshed

The procedure commits on a separate connection. The route calls `db.session.remove()` so the ORM does not keep stale state. It then loads the new appointment and returns the full detail with HTTP 201.

### Step 6: The page shows the result

The frontend shows a success notification, clears the form, and navigates to the appointment detail page. If the slot was taken, the API returns a 409 with a clear message and the page asks the patient to refresh availability.

## 4. Backend file guide

### `app/config.py`

Loads `.env`, reads the database URLs, sets the hospital time zone, configures session lifetime, sets `SameSite=Lax`, sets `HttpOnly`, and limits request bodies to one megabyte.

Security settings:

* `SESSION_COOKIE_SECURE` defaults to false for local HTTP and must be true in production.
* `SESSION_HOURS` defaults to 8.
* `CSRF_ENABLED` defaults to true.
* `ADMIN_SETUP_SECRET` defaults to an empty string, which makes first time setup return `503 setup_unavailable`.
* `CORS_ORIGINS` is an exact list, not a wildcard, because requests carry credentials.

`TestConfig` points to the test database and disables the secure cookie flag because the test client uses HTTP.

### `app/models.py`

Defines thirteen models and the allowed value tuples:

* `APPOINTMENT_STATUSES`
* `ACTIVE_APPOINTMENT_STATUSES`
* `TEST_STATUSES`
* `USER_ROLES`
* `GENDERS`
* `BLOOD_GROUPS`
* `ADMIN_SETUP_KEY` (the `admin_setup_completed` marker name)

Important model details:

* `Appointment.slot_active` is a stored generated column.
* The unique constraint `uq_doctor_active_slot` uses that column.
* `User_Account` has a role link check constraint.
* `System_Setting` is a small key value table with `setting_key` as the primary key. It stores the permanent administrator setup marker.
* Relationships use `lazy="dynamic"` only where a collection is expected to be large or filtered.
* Cascades are set on child records that cannot exist without the parent.

### `app/db_objects.py`

Contains the SQL for:

* `trg_appointment_status_audit`
* `sp_book_appointment`
* `install_database_objects()`
* `remove_database_objects()`

The migration `a1b2c3d4e5f6_database_objects.py` calls the same SQL, so a fresh database gets the objects through `flask db upgrade`.

### `app/auth.py`

Session and credential helpers:

* `credential_fingerprint(user)` returns a SHA256 fingerprint of the stored password hash.
* `start_session(user)` clears the old session, stores `user_id`, stores the credential fingerprint, marks the session permanent, and rotates the CSRF token.
* `get_current_user()` reads `user_id`, loads the account, and compares the stored fingerprint with the current database hash. A mismatch clears the session and returns no user, so a password change or a restored database invalidates older sessions.
* `login_required` and `role_required` are decorators used by protected routes. `role_required` always runs `login_required` first and then checks the role from the database, never from the request body.

CSRF helpers:

* `ensure_csrf_token()` creates or returns the session token.
* `rotate_csrf_token()` creates a new token, used at sign in.
* `csrf_protect()` is registered as a `before_request` hook. It ignores safe methods and non API paths, then compares the `X-CSRF-Token` header with the session token using `hmac.compare_digest`. A missing or wrong token returns `403 csrf_failed`.

Routes:

* `GET /api/auth/csrf` returns a session bound token.
* `GET /api/auth/setup-status` reports whether first time setup is still possible.
* `POST /api/auth/setup-admin` creates the first administrator exactly once. It checks the setup marker, requires `ADMIN_SETUP_SECRET` of at least 16 characters, validates the secret with `hmac.compare_digest`, rejects forbidden role fields, hashes the password, writes the marker, and starts a session.
* `register()` validates fields, rejects forbidden role fields, hashes the password, creates the patient and account in one transaction, and starts a session.
* `login()` checks the hash and the active flag, then starts a fresh session.
* `logout()` clears the session and issues a new CSRF token.
* `me()` returns the current user or a 401.

`setup_completed()` returns true when the `admin_setup_completed` marker exists, or when an administrator row exists on a database that predates the marker. `mark_setup_completed()` writes the marker. The marker is never removed by the application, so setup stays closed even if the administrator row is deleted.

Password hashing uses:

```python
generate_password_hash(password, method="pbkdf2:sha256:600000")
```

### `app/validation.py`

Small helpers keep routes readable:

* `json_body()` checks that the request contains a JSON object.
* `required_text()` and `optional_text()` check type and length.
* `parse_int()`, `parse_date()`, `parse_time()`, and `parse_bool()` convert values safely.
* `parse_enum()` checks allowed values.
* `pagination_args()` and `pagination_payload()` provide a consistent page shape.
* `validate_email()`, `validate_phone()`, `validate_name()`, and `validate_password()` apply field rules.
* `reject_forbidden_fields()` rejects a fixed list of sensitive fields such as `role` and `is_active`.
* `reject_unexpected_fields()` rejects every field outside a small allowlist, used by the doctor self profile.

### `app/errors.py`

Defines `ApiError` and JSON handlers. A validation error can carry a `fields` object so the frontend can place messages under the right input.

### `app/serializers.py`

Converts models to JSON. Keeping serializers in one file prevents routes from leaking password hashes or inconsistent field names.

`serialize_user()` never includes `password_hash`.

`serialize_appointment_detail()` adds tests, diagnosis, prescription, and status history.

### `app/services/availability.py`

Key functions:

| Function | Purpose |
| --- | --- |
| `hospital_now()` | Current time in the hospital time zone, without time zone metadata |
| `day_bounds()` | Start and end of a date |
| `schedule_overlaps()` | Detect overlapping clinic hours |
| `time_off_overlaps()` | Detect overlapping time off |
| `calculate_availability()` | Generate open slots |
| `is_slot_available()` | Check one slot |
| `patient_can_cancel()` | Two hour cancellation window and status check |
| `admin_can_cancel()` | Administrator cancellation rule |
| `doctor_can_change_status()` | Allowed status transition check |
| `can_write_clinical_records()` | Checked In, In Consultation, or Completed |

The status transition map is a dictionary of sets. This makes the rule easy to read and easy to test.

### `app/services/booking.py`

Calls the procedure and maps messages to HTTP errors:

| Procedure message | HTTP result |
| --- | --- |
| `This slot is no longer available...` | 409 `slot_conflict` |
| `The doctor is unavailable at this time.` | 409 `doctor_unavailable` |
| Other business failures | 400 `booking_failed` |

### `app/services/reason_guidance.py`

Holds the specialty reason rules:

| Item | Purpose |
| --- | --- |
| `SPECIALTY_REASON_RULES` | Topic, examples, and keywords for each department |
| `_matches()` | Whole word match, so `ear` does not match `heart` |
| `reason_mismatch()` | Returns a guidance message when a reason belongs to another department |

The frontend mirrors the same rules in `src/utils/reasonGuidance.ts` so the form can show examples and an inline message before the request is sent. The backend remains authoritative and returns HTTP 422 with the code `reason_mismatch`.
| Database duplicate or lock error | 409 `slot_conflict` |

### `app/public.py`

Public routes:

* `GET /api/departments` uses a left join and count.
* `GET /api/doctors` supports search and department filtering with pagination.
* `GET /api/doctors/{id}` returns one active doctor.
* `GET /api/doctors/{id}/availability?date=...` returns open slots.

### `app/appointments.py`

Patient routes:

* `GET /api/patients/me`
* `PATCH /api/patients/me`
* `GET /api/patients/me/appointments`
* `GET /api/patients/me/records`
* `POST /api/appointments`
* `GET /api/appointments/{id}`
* `POST /api/appointments/{id}/cancel`

`appointment_for_user()` enforces ownership. A patient requesting another patient appointment receives 404, not 403, so the route does not reveal that the record exists.

`appointment_permissions()` builds the buttons and status options the frontend may show. The backend still rechecks every action.

### `app/doctor.py`

Doctor routes:

* `GET /api/doctor/summary`
* `GET /api/doctor/appointments`
* `GET /api/doctor/appointments/{id}`
* `PATCH /api/doctor/appointments/{id}/status`
* `POST /api/appointments/{id}/tests`
* `POST /api/tests/{id}/result`
* `POST /api/appointments/{id}/diagnosis`
* `POST /api/diagnoses/{id}/prescription`

`get_doctor_appointment()` filters by both appointment identifier and the signed in doctor identifier. A doctor cannot load another doctor appointment even by guessing the identifier.

Clinical writes require a checked in, in consultation, or completed visit. Duplicate diagnosis, prescription, and test result attempts return 409.

### `app/admin.py`

Administrator routes cover:

* Summary metrics.
* Security settings: read the current administrator email, change the email, change the password.
* Departments: list, create, update.
* Doctors: list, create, update, reset password.
* Schedules: list, create, update, delete.
* Time off: list, create, delete.
* Appointments: list with filters, detail, cancel.

The summary endpoint uses joins and aggregates to produce counts and live preview lists for the dashboard.

Schedule creation checks overlap with other active schedules for the same doctor and day. Time off creation checks overlapping time off entries. These checks return friendly errors before the database constraint is reached.

The email change requires the current password and rejects a duplicate email. The password change requires the current password, a new password, and a matching confirmation. It rejects reuse of the current password, writes the new hash, clears the current session, and returns a new CSRF token. Every other session that still holds the old fingerprint is rejected on its next request.

The administrator security routes are:

* `GET /api/admin/security`
* `PATCH /api/admin/security/email`
* `POST /api/admin/security/password`

Every administrator route that accepts a request body calls `reject_forbidden_fields` before reading the body. A payload that tries to set `role`, `user_id`, `patient_id`, `doctor_id`, `is_active`, `username`, or `password_hash` returns `400 forbidden_field`. Role and account links are only set by trusted server code.

### `app/doctor.py` self profile

The doctor blueprint also exposes:

* `GET /api/doctor/profile`
* `PATCH /api/doctor/profile`

`GET` loads the doctor record through `user.doctor_id`, so a doctor cannot request another doctor by identifier. `PATCH` accepts only the `phone` field. Any other field, including `name`, `specialization`, `department_id`, `email`, `is_active`, and `role`, returns `400 forbidden_field`. A patient receives `403` because the route uses `role_required("doctor")`.

### `app/seed.py`

Creates the synthetic demonstration data. It uses fixed names and dates relative to the current hospital date, so the demonstration always has past, today, and future visits.

The seed contains synthetic doctor and patient accounts only. It does not contain an administrator account or an administrator password.

`clear_demo_data()` deletes rows in foreign key safe order, including `user_account` and `system_setting`, and resets auto increment values. This is why the demonstration identifiers start from 1 after a reset, and why `flask setup-admin` must be run again after `flask reset-demo`.

### `app/cli.py`

Commands:

| Command | Purpose |
| --- | --- |
| `flask setup-admin` | Create the first administrator, guarded by `ADMIN_SETUP_SECRET` |
| `flask setup-admin --rotate` | Change an existing administrator password in place |
| `flask db-objects` | Install the trigger and procedure |
| `flask seed-demo` | Load demo data when the database is empty |
| `flask seed-demo --reset` | Replace demo data |
| `flask reset-demo` | Replace demo data and print synthetic account details |
| `flask check-db` | Print counts and confirm database objects |

`setup-admin` accepts `--email`, `--password`, `--generate-password`, `--setup-secret`, `--rotate`, and `--current-password`. Without `--rotate` it refuses to run when an administrator already exists. With `--rotate` it loads the existing administrator, checks the current password, writes the new hash to the same row, and leaves every clinical table untouched. The generated password is printed once and is never stored in plain text.

## 5. Frontend file guide

### `src/App.tsx`

Route groups:

| Group | Example route | Guard |
| --- | --- | --- |
| Public | `/`, `/doctors/1`, `/login`, `/register`, `/setup` | None |
| Patient | `/patient`, `/patient/book`, `/patient/records` | `patient` role |
| Doctor | `/doctor`, `/doctor/appointments/1`, `/doctor/profile` | `doctor` role |
| Admin | `/admin`, `/admin/doctors`, `/admin/schedules`, `/admin/security` | `admin` role |
| Print | `/print/appointments/1/record` | Signed in, with page level checks |

### `src/auth/AuthContext.tsx`

* Loads `/auth/me` on start.
* Stores the current user.
* Exposes `login`, `register`, `setupAdmin`, `logout`, and `refresh`.
* `roleHome()` chooses the landing page for each role.
* `setupAdmin` calls `/auth/setup-admin` with the email, password, confirmation, and setup secret.

### `src/components/ProtectedRoute.tsx`

Shows a loading state while the session is checked. Redirects unauthenticated users to `/login` with a `next` parameter. Redirects a signed in user who lacks the role to that user home page.

This is a usability guard. The backend remains the authority.

### `src/api/client.ts`

A small wrapper around `fetch`:

* Sends cookies with `credentials: "include"`.
* Fetches `/auth/csrf` before the first unsafe request and caches the token in memory.
* Sends the token in `X-CSRF-Token` on `POST`, `PUT`, `PATCH`, and `DELETE`.
* On `403 csrf_failed`, fetches a fresh token and retries the request once.
* Remembers a new token returned by login, setup, logout, and `/auth/me`.
* Sets JSON headers when a body exists.
* Parses JSON errors into `ApiError`.
* Keeps `status`, `code`, and `fields`.
* Provides `errorMessage()` for safe display.

### `src/hooks/useApi.ts`

Handles:

* Loading state.
* Error state.
* Abort on unmount or path change.
* Reload by incrementing a version counter.
* Disabled requests when the path is `null` or `enabled` is false.

This removes repeated request boilerplate from pages.

### `src/components/`

| Component | Use |
| --- | --- |
| `Button` | Variants, loading state, disabled state |
| `BackButton` | History aware back navigation with a role home or public home fallback |
| `PageHeader` | Page title, description, actions, and the shared back button, which landing pages disable |
| `Card` | Consistent surface and spacing |
| `Form` | Labels, fields, errors, layout |
| `Modal` | Accessible dialog with Escape and focus handling, including stable focus while typing |
| `Pagination` | Page controls and counts |
| `StatusBadge` | Colour per appointment or test status |
| `StatusTimeline` | Appointment audit history |
| `ClinicalRecord` | Tests, diagnosis, prescription, print link |
| `StatCard` | Colourful dashboard metric with live preview rows and filter links |
| `DoctorAvatar` | Synthetic portrait with fallback initials |
| `Avatar` | User avatar with portrait support |
| `EmptyState` | Friendly empty state with optional action |
| `Skeleton` | Loading placeholders |
| `Toast` | Success, error, and information notifications |
| `Alert` | Inline error or information message |
| `Tabs` | Section switching |
| `PrintHeader` | Hospital identity on print pages |

### `src/layouts/`

| Layout | Use |
| --- | --- |
| `PublicLayout` | Top navigation, public back button on subpages, and footer |
| `AppLayout` | Left sidebar and mobile drawer for signed in areas |
| `PrintLayout` | Print header, back button, and print action |

### `src/pages/`

Public and shared pages:

* `HomePage` shows departments, doctors, clinic hours, and availability.
* `DoctorDetailPage` shows one public doctor record.
* `LoginPage` signs in a patient, doctor, or administrator. It has quick fill buttons for the synthetic patient and doctor accounts only.
* `RegisterPage` creates a patient account.
* `SetupPage` shows the first time administrator form while setup is open, and a clear "setup complete" message after that. It never shows the form once `setup_status` reports completion.
* `NotFoundPage` handles unknown routes.

### `src/pages/patient/`

* `PatientOverviewPage` shows the next visit, quick actions, and recent activity.
* `BookAppointmentPage` handles department, doctor, date, slot, and reason.
* `PatientAppointmentsPage` filters upcoming and past visits.
* `PatientAppointmentDetailPage` shows the visit and clinical record.
* `PatientRecordsPage` lists visits that have a diagnosis or test.
* `PatientProfilePage` edits the patient profile.

### `src/pages/doctor/`

* `DoctorDashboardPage` shows today counts, live patient previews, upcoming visits, and pending tests.
* `DoctorAppointmentsPage` filters the doctor appointment list.
* `DoctorProfilePage` shows the signed in doctor record and allows only the phone number to be edited. Name, specialization, department, email, and account status are read only.
* `ConsultationPage` is the clinical workspace. It shows patient context, status controls, tests, results, diagnosis, prescription, and print actions.

### `src/pages/admin/`

Each management area has its own page:

* `AdminDashboardPage` shows live counts, patient and test previews, department activity, status links, and the recent appointment register.
* `AdminSecurityPage` shows the current administrator email and two forms. The email form requires the current password. The password form requires the current password and a matching confirmation, then signs the administrator out.
* `AdminDoctorsPage`
* `AdminDepartmentsPage`
* `AdminSchedulesPage`
* `AdminTimeOffPage`
* `AdminAppointmentsPage`
* `AdminAppointmentDetailPage`

The pages use modals for create and edit actions and refresh their data after a successful mutation.

### `src/pages/print/`

* `PrintConfirmationPage`
* `PrintRecordPage`
* `PrintTestsPage`
* `PrintHistoryPage`

`PrintLayout` removes application navigation and provides a clean page for the browser print dialog.

## 6. Permission flow

A protected write request passes through five layers:

1. **Frontend route guard**: sends the user to the correct area. This is only a usability layer.
2. **CSRF hook**: `csrf_protect()` compares `X-CSRF-Token` with the session token on every unsafe API request.
3. **Session check**: `get_current_user()` loads the account and compares the credential fingerprint with the current password hash.
4. **Backend role decorator**: `role_required()` reads the role from the database, never from the request body.
5. **Record level check**: confirms that the patient owns the appointment or the doctor is assigned to it.

Example: a doctor opens `/doctor/appointments/5`.

* `ProtectedRoute` allows the doctor role.
* `GET /api/doctor/appointments/5` requires the doctor role.
* `get_doctor_appointment()` filters by `doctor_id == user.doctor_id`.
* If appointment 5 belongs to another doctor, the API returns 404.

Example: a patient tries to update a doctor with a crafted request.

* The patient session is valid, so `login_required` passes.
* `role_required("admin")` sees the role `patient` in the database and returns `403 forbidden`.
* The request never reaches the update code.
* If the payload also contains `role: "admin"`, `reject_forbidden_fields()` returns `400 forbidden_field` before any write.

Example: a patient opens `/print/appointments/5/record`.

* `ProtectedRoute` allows signed in users.
* `PrintRecordPage` requests the appointment.
* The backend returns 404 unless the appointment belongs to that patient.
* The page shows an access message instead of the record.

### First time administrator setup

1. The browser opens `/setup`.
2. `SetupPage` calls `GET /api/auth/setup-status`.
3. If `setup_completed` is true, the page shows a closed message and no form.
4. Otherwise the administrator enters an email, password, confirmation, and `ADMIN_SETUP_SECRET`.
5. `POST /api/auth/setup-admin` rechecks the marker, checks the secret with `hmac.compare_digest`, validates the fields, rejects forbidden role fields, and hashes the password.
6. The account and the `admin_setup_completed` marker are committed in one transaction.
7. The response starts a session and returns a CSRF token.
8. Any later setup request returns `409 setup_completed`, even if the administrator row is later deleted.

The same rules apply to `flask setup-admin`. The CLI asks for `ADMIN_SETUP_SECRET` when it is not supplied, refuses to create a second administrator without `--rotate`, and never prints a password that was not generated for that run.

### Administrator credential change

Email change:

1. `PATCH /api/admin/security/email` with `email` and `current_password`.
2. The route checks the current password, validates the new email, and rejects a duplicate.
3. The account row is updated in place.

Password change:

1. `POST /api/admin/security/password` with `current_password`, `new_password`, and `confirm_password`.
2. The route checks the current password, validates the new password, rejects reuse of the current password, and requires a matching confirmation.
3. The new hash is written and the current session is cleared.
4. The response returns a new CSRF token and the page sends the administrator to sign in again.
5. Every other session stores the old fingerprint, so its next request fails the `get_current_user()` comparison, is cleared, and receives `401 authentication_required`.

The old password stops working immediately because the database hash no longer matches it.

## 7. Status and clinical rules in code

The doctor status map is in `backend/app/services/availability.py`:

```python
DOCTOR_STATUS_TRANSITIONS = {
    "Booked": {"Confirmed", "Checked In", "Cancelled", "No Show"},
    "Confirmed": {"Checked In", "Cancelled", "No Show"},
    "Checked In": {"In Consultation", "Cancelled"},
    "In Consultation": {"Completed"},
    "Completed": set(),
    "Cancelled": set(),
    "No Show": set(),
}
```

The API returns `allowed_statuses` in the appointment detail. The consultation page renders only those buttons. The API checks the same map again when a status change is submitted.

Clinical writes are allowed when:

```python
appointment.status in ("Checked In", "In Consultation", "Completed")
```

This means a doctor cannot write a diagnosis before the patient is checked in, but can add a late result after the visit is completed.

## 8. Database access pattern

The project uses the SQLAlchemy ORM for normal reads and writes:

```python
appointment = (
    Appointment.query
    .options(joinedload(Appointment.patient), joinedload(Appointment.doctor))
    .filter(Appointment.appointment_id == appointment_id)
    .first()
)
```

Eager loading avoids the common problem of many small queries when serializing an appointment with patient, doctor, tests, diagnosis, and history.

The booking path uses a raw connection because it calls a stored procedure with `OUT` parameters. This is the only place where raw SQL is necessary.

## 9. Error handling pattern

Backend:

```python
raise ApiError("This slot is no longer available.", 409, "slot_conflict")
```

The error handler returns:

```json
{
  "error": {
    "code": "slot_conflict",
    "message": "This slot is no longer available."
  }
}
```

Validation errors add a `fields` object.

Frontend:

```ts
try {
  await api.post("/appointments", payload);
} catch (error) {
  setFormError(errorMessage(error));
}
```

The UI shows the message in an alert or under the relevant field. Unknown errors become a safe general message.

## 10. Adding a new feature

Suppose you want to add a doctor note that is visible only to the doctor.

1. Add a column to the relevant model and create a migration.
2. Add validation in the route.
3. Add the field to the serializer only for the doctor response.
4. Add the form field to the consultation page.
5. Add a backend test for permission and validation.
6. Add a frontend test if the component has meaningful logic.
7. Run `flask db upgrade`, the backend tests, the frontend tests, and the build.

Keep the change small. Do not add a new abstraction unless at least two screens need it.

## 11. Debugging tips

| Symptom | Check |
| --- | --- |
| 401 on every request | Is the backend running, and is the session cookie present? |
| 403 csrf_failed | Does the client send `X-CSRF-Token`, and was the token fetched from the same session? |
| 409 setup_completed | An administrator already exists. Use the security page or `setup-admin --rotate`. |
| 503 setup_unavailable | `ADMIN_SETUP_SECRET` is missing or shorter than 16 characters |
| 404 on a valid record | Does the record belong to the signed in patient or doctor? |
| Booking conflict | Is the slot already active, or is the doctor on time off? |
| Availability empty | Is the selected date a clinic day, and is it in the future? |
| Doctor cannot write records | Is the appointment checked in or in consultation? |
| Doctor cannot change a field | Only the phone number is allowed in the self profile |
| Migration fails | Is the database URL correct, and does the user have schema rights? |
| Frontend shows stale data | Call the page reload function or refresh the browser |
| CORS error | Check `CORS_ORIGINS` and use the Vite proxy |
| Session ends after a password change | Expected. The credential fingerprint changed. Sign in with the new password. |

Useful commands:

```powershell
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe check-db
..\.venv\Scripts\flask.exe reset-demo
..\.venv\Scripts\python.exe -m pytest -q
```

```powershell
cd frontend
npm test
npm run build
```
