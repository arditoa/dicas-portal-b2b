import { useCallback, useEffect, useState } from 'react';
import { vipListService } from '../services/vipListService';

export interface VipGuest {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'checked_in' | 'cancelled';
  created_at?: string;
}

export function useVipList(eventId: string) {
  const [guests, setGuests] = useState<VipGuest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await vipListService.getListByEvent(eventId);
      setGuests(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar lista VIP');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const addGuest = async (fullName: string, email: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      const newGuest = await vipListService.joinList(eventId, fullName, email);
      setGuests((prev) => [newGuest, ...prev]);
      setSuccess(true);
      return newGuest;
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar convidado');
      setSuccess(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckIn = async (guestId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'checked_in' ? 'pending' : 'checked_in';
    try {
      const updated = await vipListService.updateStatus(guestId, nextStatus);
      setGuests((prev) =>
        prev.map((g) => (g.id === guestId ? { ...g, status: updated.status } : g))
      );
    } catch (err: any) {
      throw new Error(err.message || 'Erro ao atualizar status');
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  return {
    guests,
    loading,
    error,
    success,
    refetch: fetchGuests,
    addGuest,
    registerGuest: addGuest,
    toggleCheckIn,
  };
}