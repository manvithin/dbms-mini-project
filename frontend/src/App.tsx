import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { PrintLayout } from "./layouts/PrintLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { DoctorDetailPage } from "./pages/DoctorDetailPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { SetupPage } from "./pages/SetupPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PatientOverviewPage } from "./pages/patient/PatientOverviewPage";
import { BookAppointmentPage } from "./pages/patient/BookAppointmentPage";
import { PatientAppointmentsPage } from "./pages/patient/PatientAppointmentsPage";
import { PatientAppointmentDetailPage } from "./pages/patient/PatientAppointmentDetailPage";
import { PatientRecordsPage } from "./pages/patient/PatientRecordsPage";
import { PatientProfilePage } from "./pages/patient/PatientProfilePage";
import { DoctorDashboardPage } from "./pages/doctor/DoctorDashboardPage";
import { DoctorAppointmentsPage } from "./pages/doctor/DoctorAppointmentsPage";
import { DoctorProfilePage } from "./pages/doctor/DoctorProfilePage";
import { ConsultationPage } from "./pages/doctor/ConsultationPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminSecurityPage } from "./pages/admin/AdminSecurityPage";
import { AdminDoctorsPage } from "./pages/admin/AdminDoctorsPage";
import { AdminDepartmentsPage } from "./pages/admin/AdminDepartmentsPage";
import { AdminSchedulesPage } from "./pages/admin/AdminSchedulesPage";
import { AdminTimeOffPage } from "./pages/admin/AdminTimeOffPage";
import { AdminAppointmentsPage } from "./pages/admin/AdminAppointmentsPage";
import { AdminAppointmentDetailPage } from "./pages/admin/AdminAppointmentDetailPage";
import { PrintConfirmationPage } from "./pages/print/PrintConfirmationPage";
import { PrintRecordPage } from "./pages/print/PrintRecordPage";
import { PrintTestsPage } from "./pages/print/PrintTestsPage";
import { PrintHistoryPage } from "./pages/print/PrintHistoryPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="doctors/:doctorId" element={<DoctorDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="print"
        element={
          <ProtectedRoute roles={["patient", "doctor", "admin"]}>
            <PrintLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="appointments/history"
          element={
            <ProtectedRoute roles={["patient"]}>
              <PrintHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="appointments/:appointmentId/confirmation" element={<PrintConfirmationPage />} />
        <Route path="appointments/:appointmentId/record" element={<PrintRecordPage />} />
        <Route path="appointments/:appointmentId/tests" element={<PrintTestsPage />} />
      </Route>

      <Route
        path="patient"
        element={
          <ProtectedRoute roles={["patient"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientOverviewPage />} />
        <Route path="book" element={<BookAppointmentPage />} />
        <Route path="appointments" element={<PatientAppointmentsPage />} />
        <Route path="appointments/:appointmentId" element={<PatientAppointmentDetailPage />} />
        <Route path="records" element={<PatientRecordsPage />} />
        <Route path="profile" element={<PatientProfilePage />} />
      </Route>

      <Route
        path="doctor"
        element={
          <ProtectedRoute roles={["doctor"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorDashboardPage />} />
        <Route path="appointments" element={<DoctorAppointmentsPage />} />
        <Route path="appointments/:appointmentId" element={<ConsultationPage />} />
        <Route path="profile" element={<DoctorProfilePage />} />
      </Route>

      <Route
        path="admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="doctors" element={<AdminDoctorsPage />} />
        <Route path="departments" element={<AdminDepartmentsPage />} />
        <Route path="schedules" element={<AdminSchedulesPage />} />
        <Route path="time-off" element={<AdminTimeOffPage />} />
        <Route path="appointments" element={<AdminAppointmentsPage />} />
        <Route path="appointments/:appointmentId" element={<AdminAppointmentDetailPage />} />
        <Route path="security" element={<AdminSecurityPage />} />
      </Route>
    </Routes>
  );
}
