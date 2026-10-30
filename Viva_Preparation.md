# Viva Preparation

This document contains questions a student is likely to face in the project viva, with short answers that match the implementation.

## A. Project overview

**Q1. What is the project about?**
It is a General Hospital Outpatient Management System. Patients book outpatient appointments, doctors record consultations, and administrators manage hospital data.

**Q2. Why did you choose this problem?**
Outpatient departments have a clear, bounded workflow that fits a mini project: availability, booking, consultation, tests, diagnosis, prescription, and records. It also demonstrates database concepts naturally.

**Q3. What are the three roles?**
Patient, doctor, and administrator.

**Q4. Why not merge doctor and administrator?**
Doctors are hospital users, but their permissions are narrower. A doctor sees only assigned appointments and writes clinical records. An administrator manages departments, doctors, schedules, time off, and appointments but does not write clinical records. Keeping the roles separate makes the permission model realistic and easier to test.

**Q5. What is the main workflow?**
A patient books a slot. The doctor checks the patient in, records clinical work, and completes the visit. The patient can then view and print the record.

**Q6. Is this a real clinical system?**
No. It is an educational project. It uses synthetic data only and is not clinically validated.

**Q7. What is the scope?**
Outpatient appointments and consultation records. It excludes inpatient care, pharmacy stock, billing, insurance, and laboratory device integration.

## B. Database design

**Q8. How many tables are there?**
Thirteen.

**Q9. Name them.**
`patient`, `department`, `doctor`, `user_account`, `doctor_schedule`, `doctor_time_off`, `appointment`, `test_order`, `test_result`, `diagnosis`, `prescription`, `appointment_status_history`, and `system_setting`.

**Q10. What is the primary key of each table?**
Most tables have a single integer primary key: `patient_id`, `department_id`, `doctor_id`, `user_id`, `schedule_id`, `time_off_id`, `appointment_id`, `test_id`, `result_id`, `diagnosis_id`, `prescription_id`, and `history_id`. `system_setting` uses the string `setting_key` as its primary key because it stores a small set of named markers.

**Q11. Why use integer surrogate keys instead of names?**
Names can change and are not guaranteed unique. Integer keys are small, stable, and efficient for foreign keys and indexes.

**Q12. What is the relationship between department and doctor?**
One department has many doctors. Each doctor belongs to one department. The foreign key is `doctor.department_id`.

**Q13. What is the relationship between patient and user account?**
One patient has zero or one account. The `patient_id` column in `user_account` is unique, which enforces the one to one link.

**Q14. Why is the account separate from the patient?**
Authentication data changes for different reasons than clinical demographics. Separating them keeps password hashes out of clinical tables and allows the same account model to serve doctors and administrators.

**Q15. How do you ensure a doctor account points to a doctor and not a patient?**
The `ck_user_account_role_link` check constraint requires the correct identifier for each role and `NULL` for the other identifier.

**Q16. What is the relationship between appointment and test order?**
One appointment has zero or many test orders. A test is optional.

**Q17. What is the relationship between test order and test result?**
One test order has zero or one result. The `test_id` column in `test_result` is unique.

**Q18. What is the relationship between diagnosis and prescription?**
One diagnosis has zero or one prescription. The `diagnosis_id` column in `prescription` is unique.

**Q19. Can a diagnosis exist without a test?**
Yes. Tests are optional. The doctor can record a diagnosis and prescription with no test order.

**Q20. Can a prescription exist without a diagnosis?**
No. `prescription.diagnosis_id` is required and references `diagnosis`.

**Q21. Can a test result exist without a test order?**
No. `test_result.test_id` is required and references `test_order`.

**Q22. Why is the test result not stored in the test order row?**
The result arrives later and is optional. A separate table avoids empty columns, enforces one result per test, and keeps order data separate from result data.

**Q23. Why is the prescription not stored in the appointment row?**
A prescription follows a diagnosis. Keeping it separate makes that dependency explicit and allows a diagnosis without a prescription.

**Q24. Why is there no Medicine table?**
The project brief explicitly excludes Medicine and Prescription_Medicine tables. Medication details are stored as text in the prescription.

**Q25. What is normalisation?**
Organising data to reduce redundancy and avoid update anomalies.

**Q26. Which normal form is the schema in?**
The schema is in third normal form for its intended scope. Each table has a single column key, non key fields depend on the key, and department, doctor, patient, and account data are stored once.

**Q27. Is `slot_active` a violation of normalisation?**
No. It is a MySQL generated column derived from `status`. It is not manually maintained duplicate data. It exists to support the unique active slot constraint.

**Q28. What is the purpose of `appointment_status_history`?**
It records every status change with the old status, new status, and time. The trigger writes it automatically.

**Q29. Why is history not stored as a text field in the appointment?**
A text field would not be queryable or atomic. One row per change is in first normal form and supports joins, ordering, and reporting.

**Q30. What is the delete rule for appointments when a patient is deleted?**
`RESTRICT`. Clinical history should not disappear silently. The patient must be handled deliberately first.

**Q31. Where is `CASCADE` used?**
On child records that have no meaning without the parent: account links, schedules, time off, tests, results, diagnoses, prescriptions, and status history.

## C. Constraints, keys, and indexes

**Q32. What is the difference between a primary key and a unique key?**
A primary key identifies a row and cannot be `NULL`. A unique key prevents duplicate non null values but can allow multiple `NULL` values in MySQL. A table has one primary key and may have several unique keys.

**Q33. Why is `department_name` unique?**
Two departments with the same name would confuse staff and reports. The unique constraint prevents that.

**Q34. Why is `username` unique?**
It is the sign in email. Two accounts cannot share it.

**Q35. What does a check constraint do?**
It restricts column values to an allowed set or condition. Examples are appointment status, gender, blood group, schedule time range, and role link.

**Q36. What is the unique active slot constraint?**
`UNIQUE (doctor_id, appointment_date, appointment_time, slot_active)`.

**Q37. How does it allow a cancelled slot to be rebooked?**
`slot_active` is `1` for active rows and `NULL` for cancelled or no show rows. MySQL allows multiple `NULL` values in a unique index, so old cancelled rows do not block a new booking.

**Q38. Why not use a partial unique index?**
MySQL does not support partial indexes in the same way as some other databases. The generated column plus a normal unique index achieves the same result.

**Q39. What is an index?**
A data structure that speeds up lookups at the cost of storage and write work.

**Q40. Which index supports doctor appointment lookup?**
`ix_appointment_doctor_date` on doctor, date, and time.

**Q41. Which index supports patient history?**
`ix_appointment_patient_date` on patient and date.

**Q42. Why index `doctor_id` and `day_of_week` together?**
Availability queries filter by both columns. A composite index serves that pattern better than two separate indexes.

**Q43. Does every foreign key need an index?**
InnoDB requires an index on the referenced key and uses an index on the foreign key column for checks and joins. The project adds explicit indexes where query patterns need them.

## D. SQL and DBMS concepts

**Q44. What is a join?**
A query that combines rows from related tables using a matching condition.

**Q45. Where is a left join used?**
The department listing uses a left join to doctor so departments with no active doctors still appear with a count of zero.

**Q46. What is an inner join?**
A join that returns only rows with a match in both tables. Appointment detail uses inner joins for the required patient and doctor.

**Q47. What is an aggregate function?**
A function that summarises many rows, such as `COUNT`, `SUM`, `AVG`, `MIN`, or `MAX`.

**Q48. Where is `GROUP BY` used?**
The department doctor count and the doctor dashboard status counts group rows by a column and aggregate them.

**Q49. What is a subquery?**
A query inside another query. The project uses SQLAlchemy relationship helpers such as `has()` and `any()`, which compile to existence subqueries.

**Q50. How is pagination implemented?**
The API reads `page` and `per_page`, applies `OFFSET` and `LIMIT`, and returns a pagination object with page, per page, total, pages, and has next or previous flags.

**Q51. Why is pagination important?**
It keeps responses small and the interface fast when the number of appointments grows.

**Q52. What is a transaction?**
A group of database operations that succeed or fail as one unit.

**Q53. What does ACID mean?**
Atomicity, consistency, isolation, and durability.

**Q54. Where is a transaction used?**
Booking runs inside `sp_book_appointment`. Registration also relies on one SQLAlchemy commit for the patient and account rows.

**Q55. What is a stored procedure?**
A named program stored in the database that can take input and output parameters and contain control flow and SQL statements.

**Q56. Why use a stored procedure for booking?**
It keeps the checks and insert in one transaction, uses row locking, and demonstrates database programming. It also reduces the chance that a future route forgets a critical check.

**Q57. What is a trigger?**
A program that runs automatically when a table event occurs.

**Q58. What does your trigger do?**
On `BEFORE UPDATE` of an appointment, it writes a history row when the status changes and sets `updated_at` to the current UTC time.

**Q59. Why `BEFORE UPDATE` instead of `AFTER UPDATE`?**
It needs to change `NEW.updated_at` before the row is saved and compare `OLD.status` with `NEW.status`.

**Q60. What is a row lock?**
A lock that prevents another transaction from changing the same row until the first transaction finishes.

**Q61. Where is `FOR UPDATE` used?**
In the procedure, on the doctor row.

**Q62. Why lock the doctor row rather than the appointment row?**
The appointment does not exist yet. The doctor row is a stable row that represents the booking resource, so locking it serialises booking attempts for that doctor.

**Q63. What is the default isolation level in MySQL InnoDB?**
`REPEATABLE READ`.

**Q64. What is a deadlock?**
Two transactions waiting for locks the other holds. MySQL detects it and rolls back one transaction. The booking service maps lock and duplicate errors to a conflict message.

**Q65. How do you prevent SQL injection?**
Use parameter binding. SQLAlchemy does this for normal queries. The procedure call uses placeholders. No user input is concatenated into SQL.

**Q66. Why MySQL instead of SQLite?**
The project needs MySQL features: generated columns, `FOR UPDATE` row locks, stored procedures, triggers, and MySQL check constraint behaviour. The brief also requires MySQL 8.

## E. Booking and availability

**Q67. How is availability calculated?**
For one doctor and date, the system finds active schedule rows for that weekday, generates slots at the configured duration, removes past slots, removes time off overlaps, and removes active appointment overlaps.

**Q68. Why check availability again during booking?**
The availability shown in the browser can become stale. Another patient may book the slot before the first patient submits.

**Q69. What happens if two patients book the same slot at the same time?**
The doctor row lock serialises the procedure calls. The first inserts and commits. The second sees the active appointment and returns a conflict. The unique constraint is a second safeguard.

**Q70. What does the patient see on a conflict?**
A 409 response with a clear message asking the patient to refresh availability and choose another time.

**Q71. When can a patient cancel?**
When the status is `Booked` or `Confirmed` and the appointment starts at least two hours in the future.

**Q72. What happens to the slot after cancellation?**
The status becomes `Cancelled`, `slot_active` becomes `NULL`, and the slot appears in availability again.

**Q73. Can an administrator cancel a checked in appointment?**
Yes. Administrator cancellation allows `Booked`, `Confirmed`, and `Checked In`. Completed, cancelled, and no show appointments cannot be cancelled.

**Q74. Why does a doctor see only assigned appointments?**
The query filters by `Appointment.doctor_id == user.doctor_id`. A guessed identifier for another doctor returns 404.

**Q75. What happens if a doctor is deactivated?**
The doctor disappears from the public directory. New bookings are rejected by the procedure. Existing appointments remain.

**Q76. What happens if a department still has doctors?**
The foreign key uses `RESTRICT`, so the department cannot be deleted until the doctors are moved or removed.

## F. Security

**Q77. How are passwords stored?**
As PBKDF2 SHA256 hashes with 600,000 iterations, using Werkzeug. Plain text passwords are never stored or returned.

**Q78. What is the difference between hashing and encryption?**
Hashing is one way and is suitable for passwords. Encryption is reversible and is used when the original value must be recovered.

**Q79. Why not store a password hash in the patient table?**
Authentication is a separate concern. Keeping it in `user_account` avoids mixing clinical and credential data and supports doctor and admin accounts with the same model.

**Q80. How is the session maintained?**
Flask stores a signed session cookie containing the user identifier, a password hash fingerprint, and a CSRF token. The cookie is `HttpOnly` and `SameSite=Lax`, and the session lifetime defaults to eight hours. Production sets `SESSION_COOKIE_SECURE=true` so the cookie is sent only over HTTPS.

**Q81. Is the session cookie encrypted?**
No. It is signed to prevent tampering. It contains the user identifier and security metadata, not the password or clinical data. The password hash stays in the database.

**Q82. What is CSRF?**
Cross site request forgery, where another site causes a signed in browser to send an unwanted request.

**Q83. Does the project use CSRF tokens?**
Yes. The browser fetches a session bound token from `/api/auth/csrf` and sends it in the `X-CSRF-Token` header on every `POST`, `PUT`, `PATCH`, and `DELETE` request. The backend compares the header with the token in the session. A missing or wrong token returns `403 csrf_failed`. The frontend retries once after fetching a fresh token. `SameSite=Lax` remains as a second layer, not the only defence.

**Q84. What is XSS?**
Cross site scripting, where untrusted content is rendered as executable markup. React escapes text by default, and the project does not use raw HTML insertion.

**Q85. How is role based access enforced?**
The backend uses `role_required` on protected routes. Record level helpers also check ownership or doctor assignment. Frontend guards are only a usability layer.

**Q86. Why return 404 instead of 403 for another patient record?**
It avoids revealing that the record exists. The user gets the same response as a missing record.

**Q87. What is an insecure direct object reference?**
Changing an identifier in a request to access another user object. The project prevents it by checking ownership on every record route.

**Q88. Are secrets committed?**
No. The real `.env` file is ignored. `.env.example` contains placeholders.

**Q89. What is the request size limit?**
One megabyte, set through `MAX_CONTENT_LENGTH`.

**Q89a. How is the first administrator created?**
The seed file contains no administrator password. The first administrator is created from `/setup` or with `flask setup-admin`. Both paths require `ADMIN_SETUP_SECRET`, which is at least 16 characters and is stored only in the backend environment. The password is hashed with PBKDF2 SHA256 and 600,000 iterations. The generated password is printed once by the CLI and is never written to the database or repository.

**Q89b. How does the system stop a second first time setup?**
A successful setup writes the `admin_setup_completed` marker to `system_setting`. The setup endpoint checks the marker before reading the request and returns `409 setup_completed` after that. The migration also writes the marker when an administrator already exists. The marker stays closed even if the administrator row is later removed.

**Q89c. How does a password change invalidate other sessions?**
The session stores a SHA256 fingerprint of the current password hash. Every authenticated request compares the session fingerprint with the current database hash. A password change writes a new hash, so every old session fails the comparison, is cleared, and receives `401`. The password change route also clears the current session and asks the user to sign in again.

**Q89d. Can a doctor update another doctor or change a role?**
No. Administrator doctor routes use `role_required("admin")`, so a doctor gets `403`. The doctor self profile route allows only the `phone` field. Every other field, including `name`, `specialization`, `department_id`, `email`, and `role`, is rejected with `400 forbidden_field`. Request payloads that try to set `role`, `doctor_id`, `patient_id`, `user_id`, `is_active`, `username`, or `password_hash` are rejected before the write.

**Q89e. What can a doctor change in the self profile?**
Only the phone number. The doctor can read the name, specialization, department, sign in email, and account status, but those fields are read only. A patient cannot open the doctor profile routes at all.

## G. Backend

**Q90. Why use Flask blueprints?**
They group routes by area and keep the application factory readable.

**Q91. What is an application factory?**
A function that creates and configures the Flask app. It makes testing easier because each test can create an app with overrides.

**Q92. Why use an ORM?**
It provides parameterised queries, relationship loading, and readable Python code. It also reduces repetitive SQL for normal CRUD work.

**Q93. Where is raw SQL used and why?**
Only for the stored procedure call and the database object checks. The procedure needs `OUT` parameters and a dedicated connection.

**Q94. What is the N plus one query problem?**
Loading a list and then issuing one query per row for a relationship. The project uses `joinedload` on appointment queries to avoid it.

**Q95. What is a serializer?**
A function that converts a model to a stable JSON shape. It prevents accidental leakage and keeps API field names consistent.

**Q96. How are errors returned?**
As JSON with an error code, a safe message, and optional field errors. Stack traces are not returned.

**Q97. Why does the booking route call `db.session.rollback()` before the procedure?**
To end the read transaction so the procedure can own its locking transaction on a separate connection.

**Q98. Why does it call `db.session.remove()` after booking?**
The procedure commits on a separate connection. Removing the session avoids stale ORM state and forces a fresh load of the new appointment.

**Q99. What is the hospital time zone?**
`Asia/Kolkata`, configured through `APP_TIMEZONE`. Availability and cancellation rules use hospital local time.

**Q100. How are event timestamps stored?**
Event timestamps such as account creation, test order, result, diagnosis, and status history use UTC. Date and time of the appointment are stored as hospital local date and time.

## H. Frontend

**Q101. Why React?**
It supports a component based interface with clear state and reusable pieces. TypeScript adds type checking for API data.

**Q102. What does `AuthContext` do?**
It loads the current user, exposes sign in, registration, sign out, and refresh, and lets route guards and pages read the session state.

**Q103. What does `ProtectedRoute` do?**
It shows a loading state while the session is checked, redirects signed out users to sign in, and redirects users who lack the required role.

**Q104. Is `ProtectedRoute` enough for security?**
No. It is a usability layer. The backend checks every protected route and every record.

**Q105. What does `useApi` handle?**
Loading, error, abort on unmount, disabled requests, and reload.

**Q106. Why abort requests on unmount?**
To avoid setting state after the component is gone and to cancel unnecessary network work.

**Q107. How does the frontend know the API address?**
It uses relative `/api` paths. Vite proxies them to the Flask server during development.

**Q108. How are loading and empty states handled?**
Pages use skeleton components while loading and `EmptyState` components when a list has no records. Buttons show a loading state and disable during submission.

**Q109. How are forms validated?**
The backend returns field errors. The frontend displays them under the matching input and shows a general alert for other errors.

**Q110. How is the interface kept accessible?**
Semantic elements, labels, focus styles, keyboard handling in the modal, descriptive button text, and status text in addition to colour. A formal accessibility audit was not run, so this remains an area to improve.

## I. Testing

**Q111. How many backend tests are there?**
Sixty seven.

**Q112. How many frontend tests are there?**
Thirty one across nine files.

**Q113. What do the backend tests cover?**
Authentication, password hashing, role isolation, first time setup, setup secret rejection, setup after administrator exists, administrator credential changes, session invalidation, CSRF, cookie flags, logout, doctor self profile, forbidden role fields, directory search, availability, booking, duplicate booking, concurrent booking, cancellation, audit history, specialty reason validation, trigger and procedure presence, constraints, status transitions, clinical records, tests, results, diagnosis, prescription, pagination, validation, dashboard summary previews, and administrator management.

The security file directly tests the 13 requested cases, including unauthenticated and wrong role doctor updates, administrator doctor update success, invalid credentials, invalid setup secret, setup after administrator exists, password change success, old password rejection, new password acceptance, and role change rejection.

**Q114. How is concurrency tested?**
Two threads attempt to book the same slot. The test verifies that only one appointment row exists.

**Q115. Why use a separate test database?**
To avoid destroying demonstration data and to allow repeatable fixtures.

**Q116. Why does the test suite use MySQL?**
SQLite would not reproduce MySQL generated columns, row locks, stored procedures, or the exact constraint behaviour.

**Q117. What is not tested?**
There is no committed end to end browser suite, no load test, no cross browser matrix, and no formal accessibility audit. The security build is deployed to the live Vercel and Render services. The Aiven `system_setting` migration and the production administrator password rotation are still pending. The known gaps are listed in the test report.

**Q118. Can you claim zero bugs?**
No. The documented workflows pass, but the project is an educational system with known limitations.

## J. Scenario questions

**Q119. A patient says the slot disappeared after they selected it. What happened?**
Another booking took the slot, or the slot time passed, or the doctor time off changed. The booking route rechecks availability and returns a conflict.

**Q120. A doctor cannot see a diagnosis button. Why?**
The appointment is not checked in or in consultation, or the doctor is not assigned to it, or a diagnosis already exists.

**Q121. A test result cannot be added. Why?**
The test may already have a result, the test may be cancelled, or the appointment may be cancelled or marked no show.

**Q122. A department cannot be deleted. Why?**
Doctors still reference it and the foreign key uses `RESTRICT`. Move or remove the doctors first.

**Q123. A doctor account cannot be created with an existing email. Why?**
`user_account.username` is unique.

**Q124. A cancelled appointment still appears in the list. Why?**
History is preserved. It no longer blocks the slot because `slot_active` is `NULL`.

**Q125. A patient can see a completed visit but no tests. Why?**
Tests are optional. The visit may have a diagnosis and prescription only.

**Q126. A doctor wants to correct a record after completion. Can they?**
Clinical writes are allowed for `Completed` appointments, so a late result or correction can be added. The status itself cannot move after completion.

**Q127. What if the database is down?**
The API returns a safe server error. The frontend shows a failure message instead of pretending the action succeeded.

**Q128. What if the frontend is refreshed on a deep route?**
Vite serves the single page application and React Router renders the correct page. In production, the web server must rewrite unknown paths to `index.html`.

## K. Design choices and improvements

**Q129. What was the hardest part?**
Preventing double booking reliably while keeping the code small enough to explain.

**Q130. Why not use JWT?**
A signed session cookie is simpler for a single backend and a student project. JWT would add token storage, expiry, and refresh complexity without improving the learning value here.

**Q131. Why not use Docker?**
It would add infrastructure that the project does not need. The setup is plain MySQL, Python, and Node.

**Q132. What would you improve first?**
Add rate limiting and account lockout, then a Content Security Policy, a committed end to end browser test suite, and automated checks against the live deployment.

**Q133. What would you add for a real hospital?**
Audit logs for reads, role management, password reset, email verification, multi factor authentication, laboratory integration, file storage for reports, billing, and a proper medicine catalogue.

**Q134. How would you support multiple hospital branches?**
Add a `branch` table, link departments and doctors to a branch, add branch identifiers to schedules and appointments, and include branch scope in every permission check.

**Q135. How would you scale availability?**
Cache schedule data, precompute slot tables for a rolling window, and keep the transactional check at booking time. The current calculation is intentionally simple.

**Q136. Why keep the project small?**
The brief asks for an undergraduate mini project that a student can understand and explain. Extra abstractions would hide the database concepts that the project is meant to demonstrate.

**Q137. How do you create an administrator or doctor account?**
Public registration creates patients only. An administrator creates a doctor account from the **Doctors** page by entering the doctor details, login email, and temporary password. The first administrator is created from `/setup` or with `flask setup-admin`, guarded by `ADMIN_SETUP_SECRET`. The CLI hashes the password and creates an account with the `admin` role and no patient or doctor link. If an administrator already exists, `flask setup-admin --rotate` updates that account in place and preserves all clinical data.

**Q138. How do the dashboard count cards stay live?**
The administrator and doctor summary endpoints return totals together with small preview lists. The cards render those previews with real patient names, and each row links to a filtered list or the appointment record.

**Q139. How is back navigation handled on every page?**
A shared `BackButton` uses browser history when it exists and falls back to the role home or the public home page. It is hidden on the public home page, sign in page, registration page, and the three role landing pages, so users do not leave a home page through a back control. Subpages show it through the shared page header or the public layout, detail pages keep a contextual back link, and the print layout has its own back button.

**Q140. How does the booking form stop a reason from going to the wrong specialty?**
Each department has a rule with a topic, examples, and keywords in `reason_guidance.py`. The booking form mirrors the rule to show examples and an inline message. The backend repeats the check before availability and booking, so a direct API request cannot bypass it. Matching uses whole words, so `ear` does not match `heart`. General Medicine has no rule and accepts any reason.
