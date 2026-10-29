# User Interface Specification

## Design objective
Create a polished, fully functional healthcare mini project with a distinctive and consistent visual system. Keep it straightforward enough to implement and explain.

## Design system
Use a refined display font for headings and a readable sans serif for body text, with reliable fallback fonts. Use a calm light background, deep ink text, a restrained teal or blue accent, neutral borders, and clear status colours. Check contrast.

Use consistent spacing, content width, alignment, buttons, form fields, cards, tables, badges, dialogs, alerts, skeletons, empty states, and notifications.

Use short transitions for page entry, dialogs, menus, and status updates. Respect reduced motion and never delay important actions.

Do not use hyphen characters in visible interface wording.

## Public pages
1. Sign in
2. Patient registration
3. Doctor directory
4. Doctor details with availability
5. Not found page

## Patient dashboard
Show a welcome heading, next appointment, current appointment status, booking action, recent appointments, and available records.

Include Overview, Book an Appointment, My Appointments, My Records, and Profile.

Make appointments visually distinct from tests, diagnoses, and prescriptions. Do not create unrelated tasks or automatically start focus sessions.

## Doctor dashboard
Show today's assigned appointments and clear consultation actions. The consultation screen includes patient summary, appointment reason, optional test ordering, result entry, diagnosis, prescription and treatment plan, and follow up date.

Allow diagnosis and prescription without a test order.

## Administrator dashboard
Show useful counts for appointments, doctors, and departments. Provide management screens for doctors, departments, schedules, time off if included, and appointments. Every metric must come from the backend.

## Interaction requirements
Every visible button must work or be disabled with a clear reason. Validate forms, preserve safe input after validation errors, prevent repeated submissions, and show clear feedback. Provide loading, empty, error, and success states. Use confirmation dialogs for destructive actions. Support keyboard navigation and visible focus indicators.

Do not use browser alert boxes as the primary interface. Do not use fake links or dead buttons. Use live API data.

## Responsive design
Support desktop, tablet, and mobile widths. Adapt navigation without hiding essential actions. Tables may become cards or scroll within a defined area on small screens.

## Printing
Provide print friendly views for appointment confirmation, appointment history, test results, diagnosis, and prescription or treatment plan. Hide navigation and action controls in print output.
