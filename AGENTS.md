# Project Agent Instructions

## Purpose
Build a General Hospital Outpatient Management System as a focused undergraduate DBMS mini project. Keep it small enough for a student to understand and explain. Do not turn it into a hospital enterprise platform.

## Rules
1. Inspect the repository before editing and preserve useful existing work.
2. Read all project specification files before implementation.
3. Build real connected features, not static mockups.
4. Use MySQL 8. Do not silently substitute SQLite.
5. Use snake_case for database fields and API fields.
6. Do not add Medicine or Prescription_Medicine tables. Store medication details as text in Prescription.
7. Diagnostic tests are optional. Diagnosis and prescription can exist without tests.
8. Test orders are created after consultation. A test result is evidence, not a diagnosis.
9. Hash passwords. Never store plain text passwords.
10. Enforce permissions in the backend, not only the frontend.
11. Use synthetic patient data only.
12. Never claim a build, test, or feature passed unless it was actually checked.
13. Make small changes and run relevant tests after each phase.
14. Keep the code readable enough for a student viva. Avoid unnecessary abstractions and infrastructure.
15. Do not use hyphen characters in visible interface text, labels, notifications, sample data, or documentation prose. Valid code syntax and package names are exempt when required.
16. Every visible button must work or be clearly disabled with a reason.
17. Provide loading, empty, success, validation, and failure states.
18. Keep secrets in environment variables.
19. Do not claim zero bugs. Verify the important workflows and report limitations honestly.

## Build order
1. Inspect repository and environment.
2. Create database schema and migrations.
3. Implement authentication and role checks.
4. Implement patients, doctors, departments, and schedules.
5. Implement appointment availability, booking, cancellation, and conflict prevention.
6. Implement consultations, optional tests, results, diagnoses, and prescriptions.
7. Implement patient, doctor, and administrator dashboards.
8. Implement print views.
9. Run automated tests and manual acceptance checks.
10. Complete setup and viva documentation.

## Completion report
Report implemented features, tables and relationships, setup commands, required environment variables, tests actually run, known limitations, and a concise explanation of the main design choices.
