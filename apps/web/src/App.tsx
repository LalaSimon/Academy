import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthInitializer } from '@/components/AuthInitializer';
import { LoginPage } from '@/pages/auth/LoginPage';
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
import { AdminLayout } from '@/layouts/AdminLayout';
import { StudentLayout } from '@/layouts/StudentLayout';
import { PrivateRoute } from '@/router/PrivateRoute';
import StudentDashboardPage from '@/pages/student/StudentDashboardPage';
import StudentClassesPage from '@/pages/student/StudentClassesPage';
import StudentAttendancePage2 from '@/pages/student/StudentAttendancePage';
import StudentGroupsPage from '@/pages/student/StudentGroupsPage';
import StudentMaterialsPage from '@/pages/student/StudentMaterialsPage';
import StudentPaymentsPage from '@/pages/student/StudentPaymentsPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <AuthInitializer>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

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
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
            <Route path="/teacher" element={<div className="p-6">Teacher Dashboard — WIP</div>} />
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
            <Route path="/parent" element={<div className="p-6">Parent Dashboard — WIP</div>} />
          </Route>

          <Route path="/unauthorized" element={<div className="p-6">Brak dostępu</div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;
