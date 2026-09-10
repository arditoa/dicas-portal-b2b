import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS, THEME } from '../constants/theme';

const backgroundColor = COLORS?.background || THEME?.bg || '#15111C';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="coupons" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="denunciar" options={{ headerShown: false }} />
        <Stack.Screen name="business/cadastre-seu-espaco" options={{ headerShown: false }} />
        <Stack.Screen name="business/indicar" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}