# General Hospital Outpatient Management System

## Purpose
A student DBMS mini project for outpatient appointments and consultation records. It demonstrates relational design, SQL queries, constraints, transactions, authentication, and a practical user interface. It is a learning project, not a real clinical system. Use synthetic data only.

## Roles
Patient: register, sign in, view doctors and available slots, book or cancel appointments, track appointment status, and view their own records.

Doctor: view assigned appointments, update appointment status, order optional diagnostic tests, record test results, diagnoses, prescriptions, treatment plans, and follow up dates.

Administrator: manage departments, doctor accounts, schedules, time off if implemented, and appointments.

## Main workflow
1. Patient creates an account and signs in.
2. Patient views doctors and available appointment times.
3. Patient books an appointment.
4. The server checks schedules and prevents conflicting bookings.
5. Doctor conducts the consultation and updates status.
6. Doctor may order zero or more tests.
7. A result may be recorded for each test order.
8. Doctor records a diagnosis when appropriate.
9. Doctor may record a prescription and treatment plan.
10. Patient views permitted records.

A test is optional. Diagnosis and prescription do not depend on a test being ordered or completed. A test order is created after consultation.

## Scope
Include registration and login, role based access, department and doctor listings, schedule based availability, booking and cancellation, consultation workflow, optional tests, results, diagnosis, prescription instructions, dashboards, printable records, validation, synthetic seed data, and setup documentation.

Exclude billing, insurance claims, inpatient admission, pharmacy inventory, laboratory equipment integration, online payments, real medical advice, and production deployment infrastructure.

## Technology
Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
Backend: Python, Flask, Flask SQLAlchemy, Flask Migrate.
Database: MySQL 8.
Testing: Pytest plus suitable frontend tests.

## Visual direction
Use polished healthcare styling with clear hierarchy, refined heading typography, readable body typography, consistent spacing, restrained colour, accessible contrast, subtle shadows, and responsive layouts. Use reliable font fallbacks. Use subtle animation for navigation, dialogs, and status changes. Respect reduced motion.

Do not use hyphen characters in visible interface wording or documentation prose. Valid code syntax and package names are exempt where needed.

## Data integrity
Use primary keys, foreign keys, required field constraints, unique department names, and backend validation. Use transactions for related writes. Prevent conflicting appointments through transaction safe checks and database constraints where practical.

## Security
Hash passwords. Never return password hashes. Patients can access only their own records. Doctors can access assigned appointments and related records. Administrators can manage system data. Enforce permissions on every protected backend endpoint.

## Acceptance criteria
1. Clean setup can create the database and start frontend and backend.
2. Patient can register and sign in.
3. Patient can see doctors and genuinely available slots.
4. Conflicting bookings are rejected.
5. Doctor can update status and complete a consultation workflow.
6. Tests are optional.
7. Results, diagnoses, and prescriptions link to the correct records.
8. Patients cannot access another patient's records.
9. Dashboards use API data, not hard coded examples.
10. Important workflows have automated tests.
11. Loading, empty, success, validation, and failure states exist.
12. Setup guide explains configuration, demo accounts, schema, and testing.
13. Final report lists only verified features and tests.
