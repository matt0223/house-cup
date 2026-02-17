/**
 * Update Check Hook
 *
 * Checks if the running app build is behind the latest version in Firestore.
 * Shows a soft nudge banner once per day until the user updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getLatestBuildNumber } from '../services/firebase/configService';
import { isFirebaseConfigured } from '../services/firebase/firebaseConfig';
import { getTodayDayKey } from '../domain/services';
import { useHouseholdStore } from '../store/useHouseholdStore';

const DISMISS_KEY = '@housecup/updateDismissedDate';
const TESTFLIGHT_URL = 'itms-beta://beta.itunes.apple.com/v1/app/6743387881';

export interface UseUpdateCheckResult {
  /** Whether the update banner should be shown */
  showBanner: boolean;
  /** Dismiss the banner for today */
  onDismiss: () => void;
  /** Open TestFlight to update */
  onUpdate: () => void;
}

/**
 * Checks if the app is outdated and manages banner visibility.
 * Only runs when Firebase is configured and the platform is iOS.
 */
export function useUpdateCheck(): UseUpdateCheckResult {
  const [showBanner, setShowBanner] = useState(false);
  const household = useHouseholdStore((s) => s.household);
  const timezone = household?.timezone ?? 'America/New_York';

  useEffect(() => {
    if (!isFirebaseConfigured() || Platform.OS !== 'ios') return;

    let cancelled = false;

    async function check() {
      try {
        const latestBuild = await getLatestBuildNumber();
        if (cancelled || !latestBuild) return;

        const currentBuild = Constants.expoConfig?.ios?.buildNumber ?? '0';

        // Compare as integers so "17" < "18" works correctly
        const current = parseInt(currentBuild, 10) || 0;
        const latest = parseInt(latestBuild, 10) || 0;

        if (current >= latest) return;

        // Check if dismissed today
        const dismissedDate = await AsyncStorage.getItem(DISMISS_KEY);
        const today = getTodayDayKey(timezone);

        if (dismissedDate === today) return;

        if (!cancelled) {
          setShowBanner(true);
        }
      } catch (error) {
        console.warn('Update check failed:', error);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [timezone]);

  const onDismiss = useCallback(() => {
    setShowBanner(false);
    const today = getTodayDayKey(timezone);
    AsyncStorage.setItem(DISMISS_KEY, today).catch(() => {});
  }, [timezone]);

  const onUpdate = useCallback(() => {
    Linking.openURL(TESTFLIGHT_URL).catch((error) => {
      console.warn('Failed to open TestFlight:', error);
    });
  }, []);

  return { showBanner, onDismiss, onUpdate };
}
