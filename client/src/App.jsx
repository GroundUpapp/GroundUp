import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      {/* Public marketing landing page. Signed-in users go straight to the app. */}
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <Landing />} />

      {/* Public legal pages */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      <Route
        path="/login"
        element={session ? <Navigate to="/app" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={session ? <Navigate to="/app" replace /> : <SignUp />}
      />

      {/* The app, behind auth. /dashboard is kept as the QuickBooks OAuth landing. */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
