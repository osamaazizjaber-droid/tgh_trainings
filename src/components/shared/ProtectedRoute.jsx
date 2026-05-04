import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ session, trainerId, children }) {
  if (!session && !trainerId) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
