import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../src/theme/useTheme';

export default function NotFoundScreen() {
  const { colors, typography, spacing } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>
          This screen doesn't exist.
        </Text>
        <Link href="/" style={{ marginTop: spacing.md }}>
          <Text style={[typography.body, { color: colors.primary }]}>
            Go to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
