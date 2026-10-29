# Build Plan

## Phase 1: Inspect
Inspect the repository and installed tools. Confirm Python, Node, and MySQL versions. Preserve useful existing work.

Exit check: setup steps and required configuration are clear.

## Phase 2: Database
Implement the clinical tables and operational tables, constraints, relationships, indexes, migrations, and synthetic seed data.

Exit check: the schema can be created from a clean database and relationships are verified.

## Phase 3: Backend foundation
Implement configuration, database connection, migrations, validation, error handling, authentication, and role checks.

Exit check: authentication and access control tests pass.

## Phase 4: Doctors and booking
Implement departments, doctors, schedules, time off if included, availability, booking, cancellation, and conflict prevention.

Exit check: valid and conflicting bookings behave correctly.

## Phase 5: Clinical workflow
Implement appointment status, optional tests, results, diagnoses, prescriptions, and follow up dates.

Exit check: both the no test workflow and test workflow pass.

## Phase 6: Frontend foundation
Implement routing, design tokens, shared components, responsive navigation, form patterns, loading states, errors, and notifications.

Exit check: shared components follow one consistent design system.

## Phase 7: Dashboards
Implement patient, doctor, and administrator dashboards using live API data.

Exit check: frontend navigation and backend permissions agree.

## Phase 8: Reports
Implement print views for appointment confirmation, history, test result, diagnosis, and prescription.

Exit check: reports are readable and omit application navigation.

## Phase 9: DBMS demonstrations
Implement and test a useful join query, aggregate query, transaction, trigger, and stored procedure. Document each in the README.

Exit check: the student can explain each object and why it exists.

## Phase 10: Verification
Create the database from a clean setup, seed demo data, run backend and frontend tests, and walk through acceptance scenarios. Fix discovered defects and document known limitations.

Exit check: report actual commands and results without claiming unverified work is finished.
