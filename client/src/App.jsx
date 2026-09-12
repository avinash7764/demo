import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';

import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Home from './pages/Home.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CoursePlayer from './pages/CoursePlayer.jsx';
import Profile from './pages/Profile.jsx';
import Certificate from './pages/Certificate.jsx';
import About from './pages/About.jsx';
import Categories from './pages/Categories.jsx';
import Instructors from './pages/Instructors.jsx';
import Wishlist from './pages/Wishlist.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminCourses from './pages/admin/AdminCourses.jsx';
import AdminCourseEditor from './pages/admin/AdminCourseEditor.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminStudentDetail from './pages/admin/AdminStudentDetail.jsx';
import AdminReviews from './pages/admin/AdminReviews.jsx';

function Loading() {
  return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Loading…</p>
    </div>
  );
}

function RequireAuth({ children, admin = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Student */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <PublicLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>
      <Route
        path="/learn/:id"
        element={
          <RequireAuth>
            <CoursePlayer />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <PublicLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Profile />} />
      </Route>
      <Route
        path="/wishlist"
        element={
          <RequireAuth>
            <PublicLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Wishlist />} />
      </Route>
      <Route
        path="/certificate/:id"
        element={
          <RequireAuth>
            <PublicLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Certificate />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <RequireAuth admin>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="courses/new" element={<AdminCourseEditor />} />
        <Route path="courses/:id/edit" element={<AdminCourseEditor />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:id" element={<AdminStudentDetail />} />
        <Route path="reviews" element={<AdminReviews />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
