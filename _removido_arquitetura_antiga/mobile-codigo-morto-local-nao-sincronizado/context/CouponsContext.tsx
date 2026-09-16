import React, { createContext, useContext, useState } from 'react';

export interface CouponItem {
  id: string;
  venueName: string;
  title: string;
  rules: string;
  code: string;
  expiresAt?: string;
}

interface CouponsContextData {
  coupons: CouponItem[];
  addCoupon: (coupon: CouponItem) => void;
}

const CouponsContext = createContext<CouponsContextData>({} as CouponsContextData);

export const CouponsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);

  const addCoupon = (newCoupon: CouponItem) => {
    setCoupons((prev) => {
      if (prev.some((c) => c.code === newCoupon.code)) return prev;
      return [newCoupon, ...prev];
    });
  };

  return (
    <CouponsContext.Provider value={{ coupons, addCoupon }}>
      {children}
    </CouponsContext.Provider>
  );
};

export const useCoupons = () => useContext(CouponsContext);