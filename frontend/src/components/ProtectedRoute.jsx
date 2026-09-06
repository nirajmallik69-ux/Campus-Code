import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Full-page spinner shown only while we're verifying an existing
// session on first load - after that, auth state is instant.
function CheckingSession() {
  return (
    <div className="center-loader">
      <span className="spinner" aria-label="Checking your session" />
    </div>
  );
}

export default function ProtectedRoute({ requireCompleteProfile = true }) {
  const { isCheckingSession, isAuthenticated, isProfileComplete } = useAuth();
  const location = useLocation();

  if (isCheckingSession) return <CheckingSession />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireCompleteProfile && !isProfileComplete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { isCheckingSession, isAuthenticated, isAdmin } = useAuth();

  if (isCheckingSession) return <CheckingSession />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// Used on /auth - keeps an already-logged-in student from seeing
// the OTP form again; sends them wherever they belong instead.
export function GuestOnlyRoute() {
  const { isCheckingSession, isAuthenticated, isProfileComplete } = useAuth();

  if (isCheckingSession) return <CheckingSession />;

  if (isAuthenticated) {
    return <Navigate to={isProfileComplete ? "/dashboard" : "/onboarding"} replace />;
  }

  return <Outlet />;
}

// Used on /onboarding - requires a logged-in student who hasn't
// completed their profile yet.
export function OnboardingRoute() {
  const { isCheckingSession, isAuthenticated, isProfileComplete } = useAuth();

  if (isCheckingSession) return <CheckingSession />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (isProfileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
