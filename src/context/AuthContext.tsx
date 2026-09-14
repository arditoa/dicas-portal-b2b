import React, { createContext, useContext, useState } from 'react';

interface UserData {
  nomeSocial: string;
  email: string;
  telefone: string;
  dataNascimento: string;
}

interface AuthContextType {
  isGuest: boolean;
  user: UserData | null;
  login: (userData: UserData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = useState(true); // Começa sempre como visitante por padrão (Aprovação Apple)
  const [user, setUser] = useState<UserData | null>(null);

  const login = (userData: UserData) => {
    setUser(userData);
    setIsGuest(false);
  };

  const logout = () => {
    setUser(null);
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider value={{ isGuest, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);