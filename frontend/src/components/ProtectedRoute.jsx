import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // Le token est en cookie httpOnly (invisible au JS).
  // On vérifie la présence des infos utilisateur stockées lors du login.
  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
