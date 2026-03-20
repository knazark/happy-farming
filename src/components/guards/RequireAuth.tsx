import { Navigate, Outlet } from 'react-router-dom';
import { getFarmerIdIfExists } from '../../firebase/db';

export function RequireAuth() {
  const farmerId = getFarmerIdIfExists();
  if (!farmerId) return <Navigate to="/" replace />;
  return <Outlet />;
}
