# Hospital Outpatient Management System

## Overview
A student DBMS mini project for outpatient appointments and consultation records. It demonstrates relational tables, foreign keys, constraints, joins, transactions, a trigger, a stored procedure, role based access, and a working web interface. Use synthetic data only.

## Technology
Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
Backend: Python, Flask, Flask SQLAlchemy, Flask Migrate.
Database: MySQL 8.
Tests: Pytest and frontend tests for key interactions.

## Specification files
AGENTS.md contains coding agent instructions.
PROJECT_SPEC.md defines scope and acceptance criteria.
DATABASE_SPEC.md defines tables and relationships.
API_SPEC.md defines backend endpoints.
UI_SPEC.md defines visual and interaction requirements.
SECURITY_SPEC.md defines security requirements.
TEST_PLAN.md defines verification scenarios.
BUILD_PLAN.md defines implementation order.

## Current status
This package contains specifications only. The application has not been generated or tested by creating this package. Update this section after implementation and verification.

## Local configuration
Create a local environment file from the example and set the MySQL connection details, application secret, and development settings. Never commit real secrets.

## Demo accounts
Add synthetic demo accounts after authentication is implemented. Document roles and local demo credentials in a safe setup guide. Do not use real personal data.

## Database summary
The eight core clinical tables are Patient, Department, Doctor, Appointment, Test_Order, Test_Result, Diagnosis, and Prescription. User_Account supports login. Doctor_Schedule supports genuine availability. Doctor_Time_Off is optional.

Medicine and Prescription_Medicine are intentionally excluded. Medication instructions are stored as text in Prescription.

## Verification
Add exact test commands and actual results after implementation. Document known limitations honestly.
