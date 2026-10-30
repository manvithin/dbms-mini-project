export type Role = "patient" | "doctor" | "admin";

export type AppointmentStatus =
  | "Booked"
  | "Confirmed"
  | "Checked In"
  | "In Consultation"
  | "Completed"
  | "Cancelled"
  | "No Show";

export interface Patient {
  patient_id: number;
  name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string | null;
  blood_group: string;
  medical_history: string | null;
  email?: string;
}

export interface Doctor {
  doctor_id: number;
  name: string;
  specialization: string;
  phone: string;
  department_id: number;
  department_name: string | null;
  is_active: boolean;
  email?: string;
  account_active?: boolean;
}

export interface DoctorProfileResponse {
  doctor: Doctor;
}

export interface SecuritySettings {
  email: string;
  role: Role;
  created_at: string;
}

export interface SecuritySettingsResponse {
  security: SecuritySettings;
}

export interface Department {
  department_id: number;
  department_name: string;
  description: string | null;
  doctor_count?: number;
}

export interface User {
  user_id: number;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  patient_id: number | null;
  doctor_id: number | null;
  name: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface TestResult {
  result_id: number;
  test_id: number;
  result_date: string;
  result_summary: string;
  remarks: string | null;
}

export interface TestOrder {
  test_id: number;
  appointment_id: number;
  test_type: string;
  order_date: string;
  status: "Ordered" | "Completed" | "Cancelled";
  notes: string | null;
  result: TestResult | null;
}

export interface Prescription {
  prescription_id: number;
  diagnosis_id: number;
  treatment_plan: string;
  instructions: string;
  follow_up_date: string | null;
}

export interface Diagnosis {
  diagnosis_id: number;
  appointment_id: number;
  diagnosis_description: string;
  diagnosis_date: string;
  notes: string | null;
  prescription: Prescription | null;
}

export interface StatusHistory {
  history_id: number;
  old_status: AppointmentStatus;
  new_status: AppointmentStatus;
  changed_at: string;
}

export interface Appointment {
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  reason_for_visit: string;
  created_at: string;
  updated_at: string;
  patient: Patient | null;
  doctor: Doctor | null;
  test_count: number;
  has_diagnosis: boolean;
  has_prescription: boolean;
  tests?: TestOrder[];
  diagnosis?: Diagnosis | null;
  status_history?: StatusHistory[];
  permissions?: {
    can_cancel: boolean;
    can_manage_clinical: boolean;
    can_change_status: boolean;
    allowed_statuses: AppointmentStatus[];
  };
}

export interface Schedule {
  schedule_id: number;
  doctor_id: number;
  doctor_name: string | null;
  department_name: string | null;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface TimeOff {
  time_off_id: number;
  doctor_id: number;
  doctor_name: string | null;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface Availability {
  doctor_id: number;
  date: string;
  day_name: string;
  slots: AvailabilitySlot[];
  has_schedule: boolean;
  message: string | null;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PendingTestPreview {
  test_id: number;
  test_type: string;
  status: string;
  order_date: string;
  appointment_id: number;
  appointment_date: string;
  appointment_time: string;
  patient: Patient | null;
  doctor: Doctor | null;
}

export interface PatientPreview {
  patient_id: number;
  name: string;
  phone: string;
  blood_group: string;
  date_of_birth?: string | null;
  gender?: string;
  last_appointment_date?: string | null;
}

export interface AdminSummary {
  patients: number;
  doctors: number;
  departments: number;
  appointments_today: number;
  upcoming_appointments: number;
  pending_tests: number;
  cancelled_appointments: number;
  completed_appointments: number;
  today_status_counts: Record<string, number>;
  status_counts: Record<string, number>;
  appointments_by_department: {
    department_id: number;
    department_name: string;
    appointment_count: number;
  }[];
  today_appointments: Appointment[];
  recent_completed_appointments: Appointment[];
  recent_cancelled_appointments: Appointment[];
  pending_test_orders: PendingTestPreview[];
  recent_patients: PatientPreview[];
  active_doctor_preview: Doctor[];
}

export interface DoctorSummary {
  today_total: number;
  today_waiting: number;
  today_in_consultation: number;
  today_completed: number;
  today_status_counts: Record<string, number>;
  upcoming_total: number;
  pending_tests: number;
  distinct_patients: number;
  recent_patients: PatientPreview[];
  pending_test_orders: PendingTestPreview[];
}

export interface DoctorDetailResponse {
  doctor: Doctor;
  schedules: Schedule[];
}

export interface DepartmentListResponse {
  departments: Department[];
}

export interface DoctorListResponse {
  doctors: Doctor[];
  pagination: Pagination;
}

export interface ScheduleListResponse {
  schedules: Schedule[];
}

export interface TimeOffListResponse {
  time_off: TimeOff[];
}

export interface AdminSummaryResponse {
  summary: AdminSummary;
  recent_appointments: Appointment[];
}

export interface DoctorSummaryResponse {
  summary: DoctorSummary;
  upcoming_appointments: Appointment[];
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  pagination: Pagination;
}

export interface RecordListResponse {
  records: Appointment[];
  pagination: Pagination;
}

export interface AppointmentDetailResponse {
  appointment: Appointment;
}

export interface ProfileResponse {
  patient: Patient;
}

export interface UserResponse {
  user: User;
}
