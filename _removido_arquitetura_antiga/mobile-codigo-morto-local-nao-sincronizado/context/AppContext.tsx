import React, { createContext, useContext, useEffect, useState } from 'react';
import { DatabaseService } from '../services/database';
import { Coupon, DatabaseEvent, DatabaseVenue, Indication, UserProfile } from '../types/database';

interface AppContextData {
  user: UserProfile | null;
  venues: DatabaseVenue[];
  events: DatabaseEvent[];
  favorites: string[];
  claimedCoupons: Coupon[];
  coupons: Coupon[];
  isLoading: boolean;
  toggleFavorite: (id: string) => Promise<void>;
  claimCoupon: (coupon: Coupon) => Promise<void>;
  loginUser: (email: string, phone: string, birthDate: string) => Promise<void>;
  registerUser: (email: string, phone: string, birthDate: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  logout: () => Promise<void>;
  submitIndication: (indication: Omit<Indication, 'id' | 'createdAt'>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [venues, setVenues] = useState<DatabaseVenue[]>([]);
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [claimedCoupons, setClaimedCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [userData, venuesData, eventsData, favsData, couponsData] = await Promise.all([
        DatabaseService.getUser(),
        DatabaseService.getVenues(),
        DatabaseService.getEvents(),
        DatabaseService.getFavorites(),
        DatabaseService.getClaimedCoupons(),
      ]);

      setUser(userData);
      setVenues(venuesData);
      setEvents(eventsData);
      setFavorites(favsData);
      setClaimedCoupons(couponsData);
    } catch (error) {
      console.error('Erro ao carregar dados do AppContext:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const toggleFavorite = async (id: string) => {
    const updated = await DatabaseService.toggleFavorite(id);
    setFavorites(updated);
  };

  const claimCoupon = async (coupon: Coupon) => {
    const updated = await DatabaseService.claimCoupon(coupon);
    setClaimedCoupons(updated);
  };

  const loginUser = async (email: string, phone: string, birthDate: string) => {
    const profile: UserProfile = {
      id: Math.random().toString(),
      email,
      phone,
      birthDate,
      createdAt: new Date().toISOString(),
    };
    await DatabaseService.saveUser(profile);
    setUser(profile);
  };

  const registerUser = async (email: string, phone: string, birthDate: string) => {
    await loginUser(email, phone, birthDate);
  };

  const logoutUser = async () => {
    await DatabaseService.logout();
    setUser(null);
  };

  const submitIndication = async (indication: Omit<Indication, 'id' | 'createdAt'>) => {
    await DatabaseService.submitIndication(indication);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        venues,
        events,
        favorites,
        claimedCoupons,
        coupons: claimedCoupons,
        isLoading,
        toggleFavorite,
        claimCoupon,
        loginUser,
        registerUser,
        logoutUser,
        logout: logoutUser,
        submitIndication,
        refreshData: loadInitialData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);