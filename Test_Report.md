# Test Report

## 1. Summary

| Check | Command | Result | Recorded on |
| --- | --- | --- | --- |
| Backend test suite | `..\.venv\Scripts\python.exe -m pytest -q` | 69 passed in 138.60 seconds | 30 October 2026 |
| Frontend test suite | `npm test` | 31 passed across 9 files | 30 October 2026 |
| Production build | `npm run build` | Passed in 7.40 seconds | 30 October 2026 |
| Administrator setup migration | `flask db upgrade` | Applied, clinical counts unchanged | 30 October 2026 |
| Database object check | `flask check-db` | Trigger present, procedure present | 30 October 2026 |
| Browser acceptance | Manual checks against the local API | Completed | 30 October 2026 |

## 2. Environment

| Item | Value |
| --- | --- |
| Operating system | Windows |
| Python | 3.14.6 |
| Node.js | 24.14.0 |
| npm | 11.9.0 |
| MySQL | 8.4.9 |
| Git | 2.55.0 |
| Application database | `hospital_outpatient` |
| Test database | `hospital_outpatient_test` |
| MySQL port in this workspace | 3307 |
| Backend address | `http://127.0.0.1:5000` in normal use, `http://127.0.0.1:5001` for the final browser checks because port 5000 was occupied |
| Frontend address | `http://localhost:5173` in normal use, `http://localhost:5175` for the final browser checks |

The tests use MySQL, not SQLite. This matters because the project depends on MySQL generated columns, check constraints, row locking, triggers, and stored procedures.

## 3. Backend tests

Command, from `backend`:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

Output:

```text
.....................................................................      [100%]
69 passed in 138.60s (0:02:18)
```

### 3.1 Authentication and access control

File: `backend/tests/test_auth.py`

| Test | What it proves |
| --- | --- |
| `test_registration_hashes_password_and_starts_session` | Registration stores a hash, not plain text, and creates a session |
| `test_duplicate_registration_is_rejected` | Duplicate email is rejected with 409 |
| `test_login_and_logout_flow` | Sign in and sign out work |
| `test_login_rejects_wrong_password` | Wrong password returns 401 |
| `test_inactive_account_cannot_login` | Inactive account cannot sign in |
| `test_registration_validation_returns_field_errors` | Field errors are returned in a usable shape |
| `test_unauthenticated_requests_are_rejected` | Protected routes require a session |
| `test_patient_cannot_use_admin_or_read_another_patient_record` | Role and ownership checks block a patient from admin routes and another patient record |
| `test_doctor_cannot_read_another_doctors_appointment` | Doctor record isolation works |

### 3.2 Public directory, availability, and booking

File: `backend/tests/test_public_booking.py`

| Test | What it proves |
| --- | --- |
| `test_departments_include_active_doctor_counts` | Department listing uses a left join and active doctor count |
| `test_doctor_directory_search_and_detail` | Search, filter, and detail responses work |
| `test_availability_excludes_booked_slots` | A booked slot is not offered |
| `test_availability_for_past_date_is_empty` | Past dates return no slots |
| `test_patient_can_book_an_available_slot` | A patient can book a valid slot |
| `test_booking_rejects_a_reason_for_another_specialty` | A reason that belongs to another department is rejected and no row is created |
| `test_booking_accepts_a_matching_specialty_reason` | A reason that matches the doctor specialty is accepted |
| `test_general_medicine_accepts_a_reason_from_another_specialty` | General Medicine accepts any reason |
| `test_reason_guidance_matches_whole_words` | Whole word matching separates `ear` from `heart` |
| `test_duplicate_booking_is_rejected_without_a_second_row` | Duplicate booking is rejected and only one row exists |
| `test_booking_requires_login_and_an_available_slot` | Unauthenticated and invalid slot attempts fail |
| `test_cancellation_releases_the_slot_and_writes_history` | Cancellation releases the slot and writes audit history |
| `test_cancellation_window_is_enforced` | The two hour cancellation window is enforced |
| `test_stored_procedure_rejects_a_conflicting_booking` | The procedure rejects a direct conflicting call |
| `test_concurrent_bookings_create_only_one_appointment` | Two parallel bookings create only one appointment |

### 3.3 Clinical workflow

File: `backend/tests/test_clinical.py`

| Test | What it proves |
| --- | --- |
| `test_doctor_status_transitions_write_audit_history` | Allowed status changes write history |
| `test_invalid_status_transition_is_rejected` | Invalid transitions are blocked |
| `test_patient_cannot_change_clinical_status` | A patient cannot change status |
| `test_clinical_records_require_check_in` | Clinical work requires the correct status |
| `test_doctor_can_record_diagnosis_and_prescription_without_tests` | Diagnosis and prescription work with no test order |
| `test_doctor_can_order_test_and_record_result` | Test order and result workflow works |
| `test_duplicate_diagnosis_and_prescription_are_rejected` | One diagnosis and one prescription per visit |
| `test_prescription_for_unknown_diagnosis_is_rejected` | Invalid parent relationship is rejected |
| `test_patient_can_read_own_clinical_record` | Patient can read own clinical record |

### 3.4 Administrator and database rules

File: `backend/tests/test_admin_and_db.py`

| Test | What it proves |
| --- | --- |
| `test_admin_summary_uses_joins_and_aggregates` | Dashboard summary uses joins, aggregates, and live previews |
| `test_doctor_summary_includes_live_patient_previews` | Doctor dashboard returns real patient previews and pending test orders |
| `test_admin_can_create_department_and_duplicate_is_rejected` | Department create and unique name rule |
| `test_admin_can_create_doctor_with_hashed_password` | Doctor create stores a hash |
| `test_schedule_overlap_is_rejected` | Overlapping schedule rows are blocked |
| `test_time_off_blocks_availability_and_overlap_is_rejected` | Time off blocks slots and overlaps are blocked |
| `test_admin_can_cancel_appointment_and_slot_is_released` | Admin cancellation releases the slot |
| `test_admin_cannot_cancel_completed_appointment` | Completed visits cannot be cancelled |
| `test_admin_appointment_search_and_filters` | Search and filters work |
| `test_trigger_and_procedure_exist` | Trigger and procedure exist in the schema |
| `test_unique_active_slot_constraint_rejects_duplicate` | The unique active slot rule works at database level |
| `test_check_constraint_rejects_invalid_status` | The status check constraint rejects invalid data |

### 3.5 Security, setup, and credential changes

File: `backend/tests/test_security.py`

These tests use the real Flask test client, the MySQL test database, and the CSRF aware client fixture. They prove the requested permission cases directly at the API boundary.

| Test | What it proves |
| --- | --- |
| `test_unauthenticated_doctor_update_is_rejected` | A signed out request to update a doctor returns `401 authentication_required` |
| `test_patient_cannot_update_a_doctor` | A patient session returns `403 forbidden` on a doctor update |
| `test_doctor_cannot_update_another_doctor` | A doctor cannot update a different doctor |
| `test_doctor_cannot_use_an_admin_endpoint` | A doctor gets `403` on administrator summary and security endpoints |
| `test_patient_cannot_use_an_admin_endpoint` | A patient gets `403` on administrator summary and security endpoints |
| `test_administrator_can_update_a_doctor` | An administrator can update a doctor and the role remains `admin` |
| `test_invalid_administrator_credentials_are_rejected` | A wrong administrator password returns `401 invalid_credentials` |
| `test_invalid_setup_secret_is_rejected` | First time setup with a wrong secret returns `403 invalid_setup_secret` |
| `test_setup_is_rejected_after_an_administrator_exists` | Setup after an administrator exists returns `409 setup_completed` |
| `test_first_time_setup_creates_one_administrator_and_closes_setup` | Setup hashes the password, writes the marker, and rejects a second setup |
| `test_setup_marker_stays_closed_after_administrator_is_removed` | The marker stays closed even if the administrator row is removed |
| `test_setup_status_falls_back_when_system_setting_table_is_missing` | Setup status returns `200` when an older database lacks `system_setting` |
| `test_setup_admin_succeeds_when_system_setting_table_is_missing` | First administrator setup succeeds and keeps the administrator account when the marker table is missing |
| `test_administrator_password_change_requires_current_password` | A wrong current password returns `400 invalid_current_password` |
| `test_administrator_password_change_invalidates_the_session` | The current session ends, the old password fails, and the new password works |
| `test_administrator_can_change_the_sign_in_email` | The old email stops working and the new email signs in |
| `test_role_changes_are_rejected_in_request_payloads` | `role`, `doctor_id`, and other forbidden fields are rejected |
| `test_doctor_can_view_and_update_only_own_contact_details` | A doctor can read and update only the own phone number |
| `test_patient_cannot_open_a_doctor_profile` | A patient gets `403` on the doctor self profile routes |
| `test_csrf_is_required_for_state_changing_requests` | A missing or wrong `X-CSRF-Token` returns `403 csrf_failed` |
| `test_session_cookie_is_http_only_and_same_site` | The session cookie is `HttpOnly` and `SameSite=Lax` |
| `test_logout_invalidates_the_session` | Logout clears the session |
| `test_setup_admin_cli_creates_a_hashed_administrator` | The CLI creates a hashed administrator |
| `test_setup_admin_cli_rotates_in_place_without_deleting_clinical_data` | Rotation preserves doctors, patients, and appointments |

## 4. Frontend tests

Command, from `frontend`:

```powershell
npm test
```

Output:

```text
 Test Files  9 passed (9)
      Tests  31 passed (31)
   Duration  5.54s
```

### 4.1 Test files

| File | Tests | Area |
| --- | --- | --- |
| `src/utils/format.test.ts` | 4 | Date, time, age, plural, and status tone formatting |
| `src/api/client.test.ts` | 2 | CSRF token fetch, header, and one retry after `csrf_failed` |
| `src/components/ProtectedRoute.test.tsx` | 4 | Session loading, sign in redirect, role redirect, allowed content |
| `src/hooks/useApi.test.tsx` | 4 | Load, failure, disabled request, reload |
| `src/components/ClinicalRecord.test.tsx` | 3 | Empty record, full record, compact mode |
| `src/components/Pagination.test.tsx` | 2 | Range display and hidden state |
| `src/components/Button.test.tsx` | 3 | Click, loading, disabled |
| `src/components/Modal.test.tsx` | 4 | Dialog confirm, cancel and Escape, closed state, focus while typing |
| `src/utils/reasonGuidance.test.ts` | 5 | Specialty guidance, whole word matching, and mismatch messages |

### 4.2 Frontend test names

* `formats dates and times for the interface`
* `handles missing values with clear fallbacks`
* `calculates age from a date of birth`
* `pluralizes counts and maps status tones`
* `shows a session check while authentication is loading`
* `sends signed out visitors to login with a return path`
* `redirects a signed in user away from another role area`
* `renders the protected content for an allowed role`
* `loads data from the API`
* `shows a safe error message when the request fails`
* `does not request data when the path is missing or disabled`
* `reloads the request when asked`
* `shows an empty state when no clinical work exists`
* `shows tests, diagnosis, prescription, and the print link`
* `hides the print action in compact mode`
* `shows the visible range and moves to the next page`
* `does not render when there are no records`
* `runs the click handler`
* `is disabled while loading`
* `is disabled when the disabled prop is set`
* `renders an accessible dialog and confirms the action`
* `closes with the cancel button and the Escape key`
* `renders nothing when closed`
* `keeps focus while a controlled field is edited`
* `fetches a session token and sends it on unsafe requests`
* `refreshes the token and retries once when the backend rejects it`
* `returns guidance for a known specialty`
* `accepts a reason that matches the selected specialty`
* `rejects a reason that clearly belongs to another specialty`
* `does not match a short word inside a longer word`
* `accepts any reason for a department without a rule`

## 5. Production build

Command, from `frontend`:

```powershell
npm run build
```

The build runs TypeScript checking and Vite production bundling. It completed successfully in 7.40 seconds. The build output was written to `frontend/dist`, which is ignored by Git. The bundle was 475.44 kB before gzip and 119.11 kB after gzip.

## 6. Database checks

Command, from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe check-db
```

Output after the administrator setup migration and the local credential rotation:

```text
departments: 6
doctors: 6
patients: 5
accounts: 12
schedules: 19
appointments: 13
test_orders: 4
prescriptions: 5
audit trigger: present
booking procedure: present
database: 127.0.0.1:3307/hospital_outpatient
```

The account count is twelve: six doctors, five patients, and one administrator. The counts before and after the `system_setting` migration were identical. The migration added the setup marker with the value `migrated` and did not change clinical rows.

The local administrator password was rotated in place with `flask setup-admin --rotate --current-password ... --generate-password`. The previous local password now returns `401 invalid_credentials`, and the generated password signs in successfully. The generated password is intentionally not recorded here.

## 7. Manual browser acceptance

The application was started with the real Flask API and MySQL database. The following checks were performed in a browser.

### 7.1 Public area

| Check | Result |
| --- | --- |
| Home page loads with departments and featured doctors | Passed |
| Health artwork and doctor portraits render | Passed |
| Doctor directory search and department filter | Passed |
| Doctor detail page shows clinic hours | Passed |
| Availability date change shows open slots | Passed |
| Mobile layout at 390 by 844 | Passed |
| Sign in page renders, patient and doctor demo buttons work, and no administrator demo button is present | Passed |
| First time setup page reports setup complete and does not offer a second setup | Passed |
| Registration page validates fields | Passed |
| Unknown route shows the not found page | Passed |

### 7.2 Patient area

| Check | Result |
| --- | --- |
| Patient sign in reaches the patient overview | Passed |
| Next appointment and recent visits use live data | Passed |
| Booking page filters doctors by department | Passed |
| Booking a valid slot succeeds | Passed |
| Duplicate or stale slot shows a conflict message | Passed |
| Appointment list filters upcoming and past | Passed |
| Appointment detail shows status timeline and record | Passed |
| Patient can cancel an eligible appointment | Passed |
| Cancelled slot becomes available again | Passed |
| Profile update saves and shows a success message | Passed |
| Records page shows only records with clinical work | Passed |
| Empty record state is clear | Passed |
| Print confirmation, record, tests, and history pages render | Passed |

### 7.3 Doctor area

| Check | Result |
| --- | --- |
| Doctor sign in reaches the doctor dashboard | Passed |
| Dashboard counts match the doctor appointments | Passed |
| Appointment list shows only assigned visits | Passed |
| Doctor cannot open another doctor appointment | Passed |
| Status controls show only allowed transitions | Passed |
| Check in and start consultation work | Passed |
| Clinical forms are disabled before check in | Passed |
| Test order can be created | Passed |
| Test result can be recorded and changes test status | Passed |
| Diagnosis can be recorded without a test | Passed |
| Prescription and follow up date can be recorded | Passed |
| Completed visit remains readable | Passed |
| Doctor profile loads only the signed in doctor record | Passed |
| Doctor phone update succeeds and the original number can be restored | Passed |
| Invalid doctor phone shows a field error and a `400` response | Passed |
| Print actions open the correct print page | Passed |

### 7.4 Administrator area

| Check | Result |
| --- | --- |
| Administrator sign in reaches the dashboard | Passed |
| Dashboard metrics, live previews, and colour cards render | Passed |
| Department create and edit work | Passed |
| Duplicate department name is rejected | Passed |
| Doctor create with account works | Passed |
| Doctor edit works | Passed |
| Doctor password reset works | Passed |
| Schedule create, edit, and delete work | Passed |
| Overlapping schedule is rejected | Passed |
| Time off create and delete work | Passed |
| Appointment search, status filter, date filter, and scope filter work | Passed |
| Administrator can cancel an eligible appointment | Passed |
| Administrator cannot cancel a completed appointment | Passed |
| Administrator security page loads the current email and both credential forms | Passed |
| Administrator sign out clears the session and returns to sign in | Passed |

### 7.5 Access control

| Check | Result |
| --- | --- |
| Signed out user is sent to sign in for patient, doctor, admin, and print routes | Passed |
| Patient cannot open doctor or admin routes | Passed |
| Doctor cannot open patient or admin routes | Passed |
| Administrator cannot open patient or doctor routes | Passed |
| Patient cannot read another patient record through the API | Passed by automated test |
| Doctor cannot read another doctor appointment through the API | Passed by automated test |

### 7.6 Navigation and live dashboard cards

These checks were run with a Playwright script against the running application and the seeded MySQL data.

| Check | Result |
| --- | --- |
| Public home page, login page, and mobile home page show no back button | Passed |
| Registration page shows no back button | Passed |
| Patient, doctor, and administrator landing pages show no back button | Passed |
| Signed in subpages show the shared page header back button | Passed |
| Doctor detail page keeps a contextual back link | Passed |
| Print layout shows a back control | Passed |
| Back controls return to the parent page or role landing page | Passed |
| A booking reason that belongs to another specialty is blocked | Passed |
| A booking reason that matches the specialty enables confirmation | Passed |
| Test result modal keeps focus and accepts the full text while typing | Passed |
| Patient overview cards open the appointment list and record list | Passed |
| Doctor card previews open an appointment record | Passed |
| Administrator patient preview opens the filtered appointment register | Passed |
| Administrator department row opens the filtered appointment register | Passed |
| Administrator status tile opens the completed appointment register | Passed |
| Doctor, patient, and administrator detail back links return to their lists | Passed |
| Dashboard cards list real patient names instead of only totals | Passed |
| Empty preview areas show a clear message | Passed |

### 7.7 Security settings and setup

These checks were run in the local browser against Flask on port 5001 and Vite on port 5175. The browser console showed only the React development notice and the expected `400` from the invalid phone validation check. The backend log showed the expected `200`, `400`, and `401` responses with no server errors.

| Check | Result |
| --- | --- |
| Signed out request to `/api/auth/me` returns `401` and the public page still renders | Passed |
| Sign in page no longer shows an administrator demo account | Passed |
| `/setup` reports setup complete after the local administrator exists | Passed |
| Administrator signs in with the rotated local password | Passed |
| Administrator dashboard loads after sign in | Passed |
| Administrator security page loads at `/admin/security` | Passed |
| Sign out from the security page returns to `/login` and clears the session | Passed |
| Doctor signs in and loads `/doctor/profile` | Passed |
| Doctor phone update succeeds and shows a success notification | Passed |
| Doctor phone update with an invalid value returns `400` and shows a field error | Passed |
| Doctor phone is restored to the original value | Passed |

### 7.8 Live deployment check after the setup fallback

The live check on 30 October 2026 confirmed:

| Check | Result |
| --- | --- |
| Render health endpoint returns `200` | Passed |
| Render `/api/auth/setup-status` returns `200` with `setup_required: false`, `setup_completed: true`, and `admin_exists: true` | Passed |
| Vercel `/setup` shows "Setup is already complete" | Passed |
| Vercel login page no longer shows an administrator demo account | Passed |
| Vercel footer no longer shows the standalone synthetic data line | Passed |
| Live frontend asset matches the local production build | Passed |

The Aiven database still lacks the `system_setting` table, so the backend fallback is what keeps setup closed. Apply the migration to make the marker explicit. The production administrator password rotation is still pending. The live administrator account is `admin@cityhospital.example` (email). The original demonstration password `Admin@123` still works locally. Rotate it as documented in [Deployment_Guide.md](Deployment_Guide.md) section 6.

## 8. Screenshot evidence

The following final screenshots are stored in `screenshots/`:

| File | Screen |
| --- | --- |
| `01-public-home.png` | Public home page |
| `02-login.png` | Sign in page |
| `03-patient-dashboard.png` | Patient overview |
| `04-booking.png` | Booking page |
| `05-patient-records.png` | Patient records |
| `06-print-record.png` | Printed clinical record |
| `07-doctor-dashboard.png` | Doctor dashboard |
| `08-consultation.png` | Consultation workspace |
| `09-admin-dashboard.png` | Administrator dashboard with live count cards and previews |
| `10-mobile-home.png` | Mobile home page |
| `11-doctor-detail.png` | Doctor detail with open slots |
| `12-booking-reason-guidance.png` | Booking reason blocked because it belongs to another specialty |
| `13-test-result-modal.png` | Test result modal with fully typed summary and remarks |

The capture run reported six `401` responses for `/api/auth/me` on public pages. These are expected because the application checks whether a visitor has a session. There were no 404 responses and no page errors in the final run.

## 9. What is not covered

The project does not claim complete coverage or zero defects.

* There is no committed end to end browser test suite. The screenshot capture script was a separate local tool.
* Browser acceptance used Microsoft Edge. Firefox and Safari were not tested.
* No formal accessibility audit tool was run. Keyboard dialog behaviour and focus styles were checked manually and in component tests.
* No load test was run. Concurrency was tested with two parallel booking attempts.
* Email, SMS, payment, file upload, and external laboratory integration are outside the project and are not tested.
* There is no automated visual regression test for the screenshots.
* The project does not test every possible invalid input combination. The main validation and permission paths are covered.
* Session behaviour with multiple backend instances was not tested.
* The live Vercel build and the live Render backend were rechecked on 30 October 2026. The setup status endpoint returned `200`, and the live setup page reported setup complete.
* The Aiven `system_setting` migration has not been applied. The backend fallback uses the administrator row to keep setup closed until the migration is run.
* The production Aiven administrator password was not rotated during this test run. Only the local development administrator was rotated.
* Render cold starts and Aiven free plan limits were observed and documented, but no uptime guarantee is claimed.
* The security tests prove the API permission cases. They do not prove that every browser or proxy configuration is safe.

## 10. Reproduction checklist

To reproduce the recorded results:

```powershell
# Backend
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe db upgrade
..\.venv\Scripts\flask.exe reset-demo
..\.venv\Scripts\flask.exe setup-admin --email admin@example.com --generate-password
..\.venv\Scripts\python.exe -m pytest -q

# Frontend
cd ..\frontend
npm test
npm run build
```

If the test database does not exist, create it and grant access before running the backend tests. The setup command prompts for `ADMIN_SETUP_SECRET`. The generated password is printed once and must not be added to this report.
