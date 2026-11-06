import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import { PageSpinner } from './components/ui';

import HomePage               from './pages/HomePage';
import LoginPage              from './pages/LoginPage';
import RegisterPage           from './pages/RegisterPage';
import DashboardPage          from './pages/DashboardPage';
import ConsultationDetailPage from './pages/ConsultationDetailPage';
import NotFoundPage           from './pages/NotFoundPage';

// ─── Guard: redirect ke /masuk jika belum login ───────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  return user ? children : <Navigate to="/masuk" replace />;
}

// ─── Guard: redirect ke /dashboard jika sudah login ──────────────────────────
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// ─── Layout beranda (dengan Navbar, Footer, WhatsApp) ────────────────────────
function PublicLayout({ children, showFooter = true, showWA = true }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      {showFooter && <Footer />}
      {showWA && <WhatsAppButton />}
    </>
  );
}

// ─── Layout dashboard (Navbar saja, tanpa hero footer) ───────────────────────
function DashboardLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <WhatsAppButton />
    </>
  );
}

// ─── Routing utama ────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Halaman publik */}
      <Route path="/" element={
        <PublicLayout>
          <HomePage />
        </PublicLayout>
      } />

      {/* Auth – hanya untuk yang belum login */}
      <Route path="/masuk" element={
        <PublicOnlyRoute>
          <PublicLayout showFooter={false} showWA={false}>
            <LoginPage />
          </PublicLayout>
        </PublicOnlyRoute>
      } />
      <Route path="/daftar" element={
        <PublicOnlyRoute>
          <PublicLayout showFooter={false} showWA={false}>
            <RegisterPage />
          </PublicLayout>
        </PublicOnlyRoute>
      } />

      {/* Dashboard – hanya untuk yang sudah login */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/dashboard/konsultasi/:id" element={
        <PrivateRoute>
          <DashboardLayout>
            <ConsultationDetailPage />
          </DashboardLayout>
        </PrivateRoute>
      } />

      {/* 404 */}
      <Route path="*" element={
        <PublicLayout showFooter={false}>
          <NotFoundPage />
        </PublicLayout>
      } />
    </Routes>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageSpinner />}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
