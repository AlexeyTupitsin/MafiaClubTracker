import { useAuth } from '../../hooks/useAuth';

export function AdminOnly({ children, fallback = null }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : fallback;
}
