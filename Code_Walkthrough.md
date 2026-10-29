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
| `auth_bp` | `/api/auth` | Registration, login, logout, current user |
| `public_bp` | `/api` | Departments, doctors, availability |
| `patient_bp` | `/api/patients` | Patient profile and own records |
| `appointment_bp` | `/api/appointments` | Booking, detail, cancellation |
| `doctor_bp` | `/api/doctor` | Doctor summary and assigned appointments |
| `clinical_bp` | `/api` | Tests, results, diagnosis, prescription |
| `admin_bp` | `/api/admin` | Management |

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
4. Rejects a past date.
5. Recalculates availability and rejects a slot that is no longer open.
6. Calls `db.session.rollback()` to end the read transaction.
7. Calls `book_appointment()` in `backend/app/services/booking.py`.

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

`TestConfig` points to the test database.

### `app/models.py`

Defines twelve models and the allowed value tuples:

* `APPOINTMENT_STATUSES`
* `ACTIVE_APPOINTMENT_STATUSES`
* `TEST_STATUSES`
* `USER_ROLES`
* `GENDERS`
* `BLOOD_GROUPS`

Important model details:

* `Appointment.slot_active` is a stored generated column.
* The unique constraint `uq_doctor_active_slot` uses that column.
* `User_Account` has a role link check constraint.
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

* `get_current_user()` reads `user_id` from the session and loads the account.
* `login_required` and `role_required` are decorators used by protected routes.
* `register()` validates fields, hashes the password, creates the patient and account in one transaction, and starts a session.
* `login()` checks the hash and the active flag.
* `logout()` clears the session.
* `me()` returns the current user or a 401.

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
* Departments: list, create, update.
* Doctors: list, create, update, reset password.
* Schedules: list, create, update, delete.
* Time off: list, create, delete.
* Appointments: list with filters, detail, cancel.

The summary endpoint uses joins and aggregates to produce counts and live preview lists for the dashboard.

Schedule creation checks overlap with other active schedules for the same doctor and day. Time off creation checks overlapping time off entries. These checks return friendly errors before the database constraint is reached.

### `app/seed.py`

Creates the synthetic demonstration data. It uses fixed names and dates relative to the current hospital date, so the demonstration always has past, today, and future visits.

`clear_demo_data()` deletes rows in foreign key safe order and resets auto increment values. This is why the demonstration identifiers start from 1 after a reset.

### `app/cli.py`

Commands:

| Command | Purpose |
| --- | --- |
| `flask create-admin` | Create a controlled administrator account with a hashed password |
| `flask db-objects` | Install the trigger and procedure |
| `flask seed-demo` | Load demo data when the database is empty |
| `flask seed-demo --reset` | Replace demo data |
| `flask reset-demo` | Replace demo data and print account details |
| `flask check-db` | Print counts and confirm database objects |

## 5. Frontend file guide

### `src/App.tsx`

Route groups:

| Group | Example route | Guard |
| --- | --- | --- |
| Public | `/`, `/doctors/1`, `/login`, `/register` | None |
| Patient | `/patient`, `/patient/book`, `/patient/records` | `patient` role |
| Doctor | `/doctor`, `/doctor/appointments/1` | `doctor` role |
| Admin | `/admin`, `/admin/doctors`, `/admin/schedules` | `admin` role |
| Print | `/print/appointments/1/record` | Signed in, with page level checks |

### `src/auth/AuthContext.tsx`

* Loads `/auth/me` on start.
* Stores the current user.
* Exposes `login`, `register`, `logout`, and `refresh`.
* `roleHome()` chooses the landing page for each role.

### `src/components/ProtectedRoute.tsx`

Shows a loading state while the session is checked. Redirects unauthenticated users to `/login` with a `next` parameter. Redirects a signed in user who lacks the role to that user home page.

This is a usability guard. The backend remains the authority.

### `src/api/client.ts`

A small wrapper around `fetch`:

* Sends cookies with `credentials: "include"`.
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
| `Modal` | Accessible dialog with Escape and focus handling |
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
* `ConsultationPage` is the clinical workspace. It shows patient context, status controls, tests, results, diagnosis, prescription, and print actions.

### `src/pages/admin/`

Each management area has its own page:

* `AdminDashboardPage` shows live counts, patient and test previews, department activity, status links, and the recent appointment register.
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

A protected request passes through three layers:

1. **Frontend route guard**: sends the user to the correct area.
2. **Backend role decorator**: checks the session user and role.
3. **Record level check**: confirms that the patient owns the appointment or the doctor is assigned to it.

Example: a doctor opens `/doctor/appointments/5`.

* `ProtectedRoute` allows the doctor role.
* `GET /api/doctor/appointments/5` requires the doctor role.
* `get_doctor_appointment()` filters by `doctor_id == user.doctor_id`.
* If appointment 5 belongs to another doctor, the API returns 404.

Example: a patient opens `/print/appointments/5/record`.

* `ProtectedRoute` allows signed in users.
* `PrintRecordPage` requests the appointment.
* The backend returns 404 unless the appointment belongs to that patient.
* The page shows an access message instead of the record.

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
| 404 on a valid record | Does the record belong to the signed in patient or doctor? |
| Booking conflict | Is the slot already active, or is the doctor on time off? |
| Availability empty | Is the selected date a clinic day, and is it in the future? |
| Doctor cannot write records | Is the appointment checked in or in consultation? |
| Migration fails | Is the database URL correct, and does the user have schema rights? |
| Frontend shows stale data | Call the page reload function or refresh the browser |
| CORS error | Check `CORS_ORIGINS` and use the Vite proxy |

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
