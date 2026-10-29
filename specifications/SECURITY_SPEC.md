# Security and Privacy Specification

This is an educational demonstration. Do not use real patient records or describe the app as clinically validated.

## Passwords and sessions
Hash passwords with a recognised library. Never log passwords or return password hashes. Apply session expiration. Keep secrets in environment variables.

## Role access
Patients access only their own records. Doctors access assigned appointments and related records required for the visit. Administrators manage permitted system data.

Enforce rules in every protected backend route. Frontend route guards are only a usability layer.

## Input and output
Validate types, lengths, required fields, dates, identifiers, and allowed status values. Use ORM parameterisation. Avoid unsafe dynamic SQL. Escape untrusted content when rendered. Limit request sizes and return safe server errors.

## Configuration
Provide an environment example file with placeholders. Ignore real environment files, secrets, local databases, build output, and virtual environments.

## Audit and error handling
Log useful operational events without passwords, session secrets, or unnecessary patient details. Keep stack traces in development logs only.

## Required security tests
Test unauthenticated access, wrong role access, cross patient record access, invalid booking, duplicate booking attempts, and invalid record relationships.
