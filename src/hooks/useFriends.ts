import { useState, useEffect, useCallback } from 'react';
import { getFarmerId, getFarmer, getNeighborProfiles, getPendingRequests, type FarmerProfile } from '../firebase/db';

export function useFriends() {
  const [friends, setFriends] = useState<FarmerProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const myId = getFarmerId();
      const [me, pending] = await Promise.all([
        getFarmer(myId),
        getPendingRequests(myId),
      ]);
      const ids = me?.neighborIds ?? [];
      if (ids.length > 0) {
        const profiles = await getNeighborProfiles(ids);
        setFriends(profiles);
      } else {
        setFriends([]);
      }
      setPendingRequests(pending);
    } catch (err) {
      console.warn('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { friends, pendingRequests, loading, refresh };
}
