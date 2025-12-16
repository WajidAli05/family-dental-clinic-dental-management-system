import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ role, children }) => {
  const user = JSON.parse(localStorage.getItem('user')); // Assuming you store user info in localStorage

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== role) {
    // Optionally redirect to their correct dashboard
    switch(user.role) {
      case 'owner': return <Navigate to="/owner-dashboard" />;
      case 'dentist': return <Navigate to="/dentist-dashboard" />;
      case 'receptionist': return <Navigate to="/receptionist-dashboard" />;
      case 'lab': return <Navigate to="/lab-dashboard" />;
      default: return <Navigate to="/login" />;
    }
  }

  return children;
};

export default ProtectedRoute;