import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import DraggableSidebar from '@/components/draggable-sidebar';
import { useColorScheme } from '@/hooks/use-color-scheme';

const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: 'inbox',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <DraggableSidebar>
            <Stack>
              <Stack.Screen name="inbox" options={{ headerShown: false }} />
              <Stack.Screen name="project/[projectId]" options={{ headerShown: false }} />
              <Stack.Screen name="task/[taskId]" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          </DraggableSidebar>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
