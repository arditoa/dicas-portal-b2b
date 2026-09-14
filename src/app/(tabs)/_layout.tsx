import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E1306C',
        tabBarInactiveTintColor: '#626274',
        tabBarStyle: {
          backgroundColor: '#161520',
          borderTopColor: '#232230',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      {/* 1. Início (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Feather name="compass" size={20} color={color} />,
        }}
      />

      {/* 2. Mapa (Puxa os dados da tela explore.tsx) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Feather name="map-pin" size={20} color={color} />,
        }}
      />

      {/* 3. Eventos */}
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={20} color={color} />,
        }}
      />

      {/* 4. Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
        }}
      />

      {/* Ocultar abas secundárias da barra inferior */}
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="category" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="tourism" options={{ href: null }} />
    </Tabs>
  );
}