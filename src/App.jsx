import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Overview from "./pages/Overview";
import DepartmentPage from "./pages/DepartmentPage";
import UploadPage from "./pages/UploadPage";
import AboutPage from "./pages/AboutPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import NotFoundPage from "./pages/NotFoundPage";
import EmployeeDrawer from "./components/EmployeeDrawer";
import Footer from "./components/Footer";
import { RangeProvider } from "./context/RangeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AuthedApp() {
  const { isAdmin } = useAuth();
  // Owned here rather than inside a page component: the navbar search can
  // find an employee in any department from any page, so the drawer it
  // opens has to live above the routed page content instead of belonging
  // to whichever page happens to be showing (Overview/DepartmentPage each
  // still keep their own separate drawer state for clicking a row directly).
  const [searchEmp, setSearchEmp] = useState(null);
  return (
    <RangeProvider>
      <div className="app-shell">
        <div className="brand-strip" />
        <Navbar onSelectEmployee={setSearchEmp} />
        <div className="app-body">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/department/:dept" element={<DepartmentPage />} />
              <Route path="/about" element={<AboutPage />} />
              {isAdmin && <Route path="/upload" element={<UploadPage />} />}
              {isAdmin && <Route path="/users" element={<UsersPage />} />}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Footer />
          </main>
        </div>
        {searchEmp && <EmployeeDrawer empNo={searchEmp} onClose={() => setSearchEmp(null)} />}
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
