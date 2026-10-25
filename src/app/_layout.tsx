import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/theme';
import { SnaplyWelcomeIntro } from '@/components/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    // Hide splash screen after initialization
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationGate>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="camera/preview" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="moment/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="friend-requests" options={{ headerShown: false }} />
            <Stack.Screen name="widget-config" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
            <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="auth/verify-email" options={{ headerShown: false }} />
            <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
            <Stack.Screen name="settings/subscription" options={{ headerShown: false }} />
            <Stack.Screen name="settings/storage" options={{ headerShown: false }} />
            <Stack.Screen name="settings/support" options={{ headerShown: false }} />
            <Stack.Screen
              name="report"
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="user/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="chat/[id]"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="group/create"
              options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack>
          <SnaplyWelcomeIntro />
          </NavigationGate>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
