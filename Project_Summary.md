# Project Summary

## General Hospital Outpatient Management System

A small, complete outpatient system built with MySQL 8, Flask, and React.

### The problem

A hospital outpatient department needs to manage doctor availability, patient bookings, consultation notes, optional tests, diagnoses, and prescriptions without double booking slots or exposing one patient record to another.

### The solution

The application provides three separate role areas:

* **Patient:** register, browse doctors and departments, view open slots, book, cancel, review own records, update own profile, and print records.
* **Doctor:** view only assigned appointments, move visits through allowed statuses, order optional tests, record results, diagnosis, prescription, and follow up date.
* **Administrator:** manage departments, doctors, schedules, time off, and all appointments, reset doctor passwords, and change the administrator sign in email and password.

The public area lets visitors compare departments, doctors, clinic hours, and availability before signing in.

### Database highlights

The schema has thirteen tables:

`patient`, `department`, `doctor`, `user_account`, `doctor_schedule`, `doctor_time_off`, `appointment`, `test_order`, `test_result`, `diagnosis`, `prescription`, `appointment_status_history`, and `system_setting`.

Key database features:

* Primary keys, foreign keys, unique constraints, and check constraints.
* A role link check that keeps patient, doctor, and administrator accounts consistent.
* A generated `slot_active` column plus a unique index that prevents two active bookings for the same doctor, date, and time.
* A `BEFORE UPDATE` trigger that writes status history and refreshes `updated_at`.
* A `sp_book_appointment` stored procedure that locks the doctor row, checks the schedule, time off, and conflicts, and inserts the booking inside one transaction.
* Optional test results, diagnosis, and prescription tables with one to one constraints.
* Indexes for doctor schedules, patient history, doctor daily lists, status filters, tests, and audit history.

### Security

* Passwords are hashed with PBKDF2 SHA256 and 600,000 iterations. Password hashes are never returned by the API.
* The seed file contains no administrator password. The first administrator is created with `/setup` or `flask setup-admin`, guarded by `ADMIN_SETUP_SECRET`.
* The `system_setting` marker permanently closes first time setup after success.
* Session cookies are `HttpOnly`, use `SameSite=Lax`, and must be marked `Secure` in production. The lifetime defaults to eight hours.
* State changing requests require a session bound CSRF token in `X-CSRF-Token`.
* Every protected backend route checks the role. Forbidden role and account link fields are rejected in request payloads.
* Patients can read only their own records. Doctors can read only assigned appointments and can update only their own phone number. Administrators cannot write clinical records.
* Administrator email and password changes require the current password. A password change ends sessions and the old password stops working.
* Input is validated on the server. Secrets are stored in environment variables. All data is synthetic.

### Interface

The signed in areas use a left sidebar. The public area uses a top navigation bar. On small screens the menu button sits on the left beside the General Hospital logo and opens a left drawer.

The public home page, sign in page, registration page, and the three role landing pages do not show a back control. Subpages use the shared page header button on signed in pages, the public layout button on public subpages, or a contextual link back to their parent list. The print layout provides its own back button.

The booking form shows specialty examples and blocks a reason that clearly belongs to another department. The backend repeats the check, so a direct API request cannot bypass it. General Medicine stays unrestricted because it is the first contact department.

Dashboard count cards are data driven. Each card shows a total, a short list of real patient or visit records, and a link to the matching filtered list or appointment record. Empty cards explain that no matching records exist.

The visual system includes synthetic doctor portraits, department illustrations, health artwork, colour coded statistics, status badges, loading skeletons, empty states, validation messages, success notifications, and print layouts.

### Verification

| Check | Result |
| --- | --- |
| Backend tests | 67 passed |
| Frontend tests | 31 passed across 9 files |
| Production build | Passed |
| Administrator setup migration | Applied, clinical counts unchanged |
| Trigger and procedure check | Present |
| Browser acceptance | Completed for the main workflows and security settings |

### Main design choices

* Three roles are kept separate because doctors have narrower clinical permissions than administrators.
* Tests are optional so a diagnosis and prescription can exist without a test.
* A test result is evidence, not a diagnosis. The doctor writes the diagnosis.
* Medication details are stored as text in the prescription. No Medicine or Prescription_Medicine tables are used.
* Booking uses both a stored procedure and a unique active slot constraint for defence in depth.
* The code avoids unnecessary infrastructure so a student can explain it in a viva.

### Known limitations

The project has no email verification, patient password reset, multi factor authentication, rate limiting, file upload for test reports, medicine inventory, billing, or external laboratory integration. CSRF protection and first time administrator setup are implemented, but there is no Content Security Policy, HTTP Strict Transport Security header, or separate server side session revocation list. The free Render service can take about one minute to wake, and the free Aiven database has a 76 connection limit and can power off after inactivity. It is an educational demonstration, not a clinical system. The documented workflows pass, but the project does not claim zero defects.

### Demonstration accounts

| Role | Email | Password |
| --- | --- | --- |
| Doctor | `meera.iyer@example.com` | `Doctor@123` |
| Patient | `riya.kapoor@example.com` | `Patient@123` |

The administrator account is created locally with `flask setup-admin` and is not seeded with a public password. The production administrator must be rotated before the live site is used.

### Documentation map

* [README.md](README.md) for setup.
* [Project_Report.md](Project_Report.md) for the full report.
* [Database_Explanation.md](Database_Explanation.md) for schema details.
* [Code_Walkthrough.md](Code_Walkthrough.md) for the code tour.
* [Test_Report.md](Test_Report.md) for test evidence.
* [Demo_Guide.md](Demo_Guide.md) for the demonstration.
* [Viva_Preparation.md](Viva_Preparation.md) for questions and answers.
* [Deployment_Guide.md](Deployment_Guide.md) for Vercel, Render, Aiven, and production rotation.
