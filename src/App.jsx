import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Overview from "./pages/Overview";
import DepartmentPage from "./pages/DepartmentPage";
import UploadPage from "./pages/UploadPage";
import AboutPage from "./pages/AboutPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import { RangeProvider } from "./context/RangeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AuthedApp() {
  const { isAdmin } = useAuth();
  return (
    <RangeProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Navbar />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/department/:dept" element={<DepartmentPage />} />
            <Route path="/about" element={<AboutPage />} />
            {isAdmin && <Route path="/upload" element={<UploadPage />} />}
            {isAdmin && <Route path="/users" element={<UsersPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </RangeProvider>
  );
}

function Gate() {
  const { isAuthenticated, meLoading } = useAuth();
  if (isAuthenticated && meLoading) {
    // Briefly loading role/department info right after a token is found
    // (fresh login or page refresh) -- avoids flashing admin-only nav
    // items before we actually know the role.
    return <div className="empty-state">Loading…</div>;
  }
  return isAuthenticated ? <AuthedApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
