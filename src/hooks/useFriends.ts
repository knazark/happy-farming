import { useState, useEffect, useCallback } from 'react';
import { getFarmerId, getFriendIds, getNeighborProfiles, getPendingRequests, type FarmerProfile } from '../firebase/rtdb';

export function useFriends() {
  const [friends, setFriends] = useState<FarmerProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const myId = getFarmerId();
      const [ids, pending] = await Promise.all([
        getFriendIds(myId),
        getPendingRequests(myId),
      ]);
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
