import React, { createContext, useContext, useState } from 'react';

type FavoriteItem = {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  rating: string;
};

type FavoritesContextType = {
  favorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType>({} as FavoritesContextType);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    {
      id: 'vezpa-bar',
      name: 'Vezpa Bar & Cozinha',
      category: 'Bares & Drinks',
      neighborhood: 'Pinheiros',
      rating: '5.0',
    },
  ]);

  const toggleFavorite = (item: FavoriteItem) => {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === item.id);
      if (exists) {
        return prev.filter((fav) => fav.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const isFavorite = (id: string) => favorites.some((fav) => fav.id === id);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);