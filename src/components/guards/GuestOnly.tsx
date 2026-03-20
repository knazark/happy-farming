import { Navigate } from 'react-router-dom';
import { getFarmerIdIfExists } from '../../firebase/db';

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const farmerId = getFarmerIdIfExists();
  if (farmerId) return <Navigate to="/game" replace />;
  return <>{children}</>;
}
