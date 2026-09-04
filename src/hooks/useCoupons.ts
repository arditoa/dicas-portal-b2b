import { useCallback, useEffect, useState } from 'react';
import { couponService } from '../services/couponService';
import { Coupon } from '../types/coupon';

export function useCoupons(venueId: string) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await couponService.getVenueCoupons(venueId);
      setCoupons(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (venueId) fetchCoupons();
  }, [venueId, fetchCoupons]);

  const createCoupon = async (newCoupon: Omit<Coupon, 'id' | 'created_at' | 'used_count'>) => {
    try {
      await couponService.createCoupon(newCoupon);
      await fetchCoupons();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cupom.');
      return false;
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await couponService.toggleStatus(id, !currentStatus);
      await fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar status.');
    }
  };

  return { coupons, loading, error, createCoupon, toggleStatus, refresh: fetchCoupons };
}