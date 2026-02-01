import { Stack } from 'expo-router';

/**
 * Onboarding route group layout.
 * Simple stack navigator without headers (screens handle their own).
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="join" />
    </Stack>
  );
}
