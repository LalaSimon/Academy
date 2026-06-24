import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LoginPage } from '@/pages/auth/LoginPage';
import { PrivateRoute } from '@/router/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<div>Admin Dashboard — WIP</div>} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
            <Route path="/teacher" element={<div>Teacher Dashboard — WIP</div>} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['STUDENT']} />}>
            <Route path="/student" element={<div>Student Dashboard — WIP</div>} />
          </Route>

          <Route element={<PrivateRoute allowedRoles={['PARENT']} />}>
            <Route path="/parent" element={<div>Parent Dashboard — WIP</div>} />
          </Route>

          <Route path="/unauthorized" element={<div>Brak dostępu</div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
