# Test Report

## 1. Summary

| Check | Command | Result | Recorded on |
| --- | --- | --- | --- |
| Backend test suite | `..\.venv\Scripts\python.exe -m pytest -q` | 46 passed in 93.75 seconds | 30 October 2026 |
| Frontend test suite | `npm test` | 28 passed across 8 files | 30 October 2026 |
| Production build | `npm run build` | Passed | 30 October 2026 |
| Database object check | `flask check-db` | Trigger present, procedure present | 29 October 2026 |
| Demo data reset | `flask reset-demo` | Passed | 29 October 2026 |
| Browser acceptance | Manual and Playwright screenshots | Completed | 30 October 2026 |

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
| Backend address | `http://127.0.0.1:5000` |
| Frontend address | `http://localhost:5173` |

The tests use MySQL, not SQLite. This matters because the project depends on MySQL generated columns, check constraints, row locking, triggers, and stored procedures.

## 3. Backend tests

Command, from `backend`:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

Output:

```text
..............................................                           [100%]
46 passed in 93.75s (0:01:33)
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
| `test_create_admin_command_hashes_password` | The setup command creates an administrator with a hashed password and no clinical link |

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

## 4. Frontend tests

Command, from `frontend`:

```powershell
npm test
```

Output:

```text
 Test Files  8 passed (8)
      Tests  28 passed (28)
   Duration  6.36s
```

### 4.1 Test files

| File | Tests | Area |
| --- | --- | --- |
| `src/utils/format.test.ts` | 4 | Date, time, age, plural, and status tone formatting |
| `src/components/ProtectedRoute.test.tsx` | 4 | Session loading, sign in redirect, role redirect, allowed content |
| `src/hooks/useApi.test.tsx` | 4 | Load, failure, disabled request, reload |
| `src/components/ClinicalRecord.test.tsx` | 3 | Empty record, full record, compact mode |
| `src/components/Pagination.test.tsx` | 2 | Range display and hidden state |
| `src/components/Button.test.tsx` | 3 | Click, loading, disabled |
| `src/components/Modal.test.tsx` | 3 | Dialog confirm, cancel and Escape, closed state |
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

## 5. Production build

Command, from `frontend`:

```powershell
npm run build
```

The build runs TypeScript checking and Vite production bundling. It completed successfully. The build output was written to `frontend/dist`, which is ignored by Git.

## 6. Database checks

Command, from `backend`:

```powershell
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe check-db
```

Output after the final demo reset:

```text
departments: 6
doctors: 6
patients: 4
accounts: 11
schedules: 19
appointments: 10
test_orders: 2
prescriptions: 3
audit trigger: present
booking procedure: present
database: 127.0.0.1:3307/hospital_outpatient
```

The account count is eleven: six doctors, four patients, and one administrator.

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
| Sign in page renders and demo fill buttons work | Passed |
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
| Patient overview cards open the appointment list and record list | Passed |
| Doctor card previews open an appointment record | Passed |
| Administrator patient preview opens the filtered appointment register | Passed |
| Administrator department row opens the filtered appointment register | Passed |
| Administrator status tile opens the completed appointment register | Passed |
| Doctor, patient, and administrator detail back links return to their lists | Passed |
| Dashboard cards list real patient names instead of only totals | Passed |
| Empty preview areas show a clear message | Passed |

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

## 10. Reproduction checklist

To reproduce the recorded results:

```powershell
# Backend
cd backend
$env:FLASK_APP = "run.py"
..\.venv\Scripts\flask.exe db upgrade
..\.venv\Scripts\flask.exe reset-demo
..\.venv\Scripts\python.exe -m pytest -q

# Frontend
cd ..\frontend
npm test
npm run build
```

If the test database does not exist, create it and grant access before running the backend tests.
