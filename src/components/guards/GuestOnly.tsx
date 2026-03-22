import { Navigate } from 'react-router-dom';
import { getFarmerIdIfExists } from '../../firebase/rtdb';

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const farmerId = getFarmerIdIfExists();
  if (farmerId) return <Navigate to="/game" replace />;
  return <>{children}</>;
}
