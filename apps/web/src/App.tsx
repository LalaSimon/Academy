import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthInitializer } from '@/components/AuthInitializer';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ParentSetupPage } from '@/pages/parent/ParentSetupPage';
import { TeachersPage } from '@/pages/admin/TeachersPage';
import { StudentsPage } from '@/pages/admin/StudentsPage';
import { GroupsPage } from '@/pages/admin/GroupsPage';
import { GroupDetailPage } from '@/pages/admin/GroupDetailPage';
import { ClassesPage } from '@/pages/admin/ClassesPage';
import { StudentAttendancePage } from '@/pages/admin/StudentAttendancePage';
import { StudentProfilePage } from '@/pages/admin/StudentProfilePage';
import { TeacherProfilePage } from '@/pages/admin/TeacherProfilePage';
import { AttendancePage } from '@/pages/admin/AttendancePage';
import MaterialsPage from '@/pages/admin/MaterialsPage';
import { PaymentsPage } from '@/pages/admin/PaymentsPage';
import { ReportsPage } from '@/pages/admin/ReportsPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { ParentLayout } from '@/layouts/ParentLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';
import { TeacherDashboardPage } from '@/pages/teacher/TeacherDashboardPage';
import { TeacherClassesPage } from '@/pages/teacher/TeacherClassesPage';
import { TeacherStatsPage } from '@/pages/teacher/TeacherStatsPage';
import { TeacherGroupsPage } from '@/pages/teacher/TeacherGroupsPage';
import { TeacherGroupDetailPage } from '@/pages/teacher/TeacherGroupDetailPage';
import ParentDashboardPage from '@/pages/parent/ParentDashboardPage';
import ParentChildClassesPage from '@/pages/parent/ParentChildClassesPage';
import ParentChildAttendancePage from '@/pages/parent/ParentChildAttendancePage';
import ParentChildGroupsPage from '@/pages/parent/ParentChildGroupsPage';
import ParentChildMaterialsPage from '@/pages/parent/ParentChildMaterialsPage';
import ParentChildPaymentsPage from '@/pages/parent/ParentChildPaymentsPage';
import { PrivateRoute } from '@/router/PrivateRoute';
import StudentDashboardPage from '@/pages/student/StudentDashboardPage';
import StudentClassesPage from '@/pages/student/StudentClassesPage';
import StudentAttendancePage2 from '@/pages/student/StudentAttendancePage';
import StudentGroupsPage from '@/pages/student/StudentGroupsPage';
import StudentMaterialsPage from '@/pages/student/StudentMaterialsPage';
import StudentPaymentsPage from '@/pages/student/StudentPaymentsPage';
import LandingPage from '@/pages/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <AuthInitializer>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/parent/setup" element={<ParentSetupPage />} />

          <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/teachers" replace />} />
              <Route path="/admin/teachers" element={<TeachersPage />} />
              <Route path="/admin/students" element={<StudentsPage />} />
              <Route path="/admin/groups" element={<GroupsPage />} />
              <Route path="/admin/groups/:id" element={<GroupDetailPage />} />
              <Route path="/admin/classes" element={<ClassesPage />} />
              <Route path="/admin/teachers/:teacherId" element={<TeacherProfilePage />} />
              <Route path="/admin/students/:studentId" element={<StudentProfilePage />} />
              <Route path="/admin/students/:studentId/attendance" element={<StudentAttendancePage />} />
              <Route path="/admin/attendance" element={<AttendancePage />} />
              <Route path="/admin/materials" element={<MaterialsPage />} />
              <Route path="/admin/payments" element={<PaymentsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/classes" element={<TeacherClassesPage />} />
              <Route path="/teacher/groups" element={<TeacherGroupsPage />} />
              <Route path="/teacher/groups/:groupId" element={<TeacherGroupDetailPage />} />
              <Route path="/teacher/stats" element={<TeacherStatsPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['STUDENT']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/classes" element={<StudentClassesPage />} />
              <Route path="/student/attendance" element={<StudentAttendancePage2 />} />
              <Route path="/student/groups" element={<StudentGroupsPage />} />
              <Route path="/student/materials" element={<StudentMaterialsPage />} />
              <Route path="/student/payments" element={<StudentPaymentsPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['PARENT']} />}>
            <Route element={<ParentLayout />}>
              <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
              <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
              <Route path="/parent/children/:childId/classes" element={<ParentChildClassesPage />} />
              <Route path="/parent/children/:childId/attendance" element={<ParentChildAttendancePage />} />
              <Route path="/parent/children/:childId/groups" element={<ParentChildGroupsPage />} />
              <Route path="/parent/children/:childId/materials" element={<ParentChildMaterialsPage />} />
              <Route path="/parent/children/:childId/payments" element={<ParentChildPaymentsPage />} />
            </Route>
          </Route>

          <Route path="/unauthorized" element={<div className="p-6">Brak dostępu</div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;
