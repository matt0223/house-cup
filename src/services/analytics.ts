/**
 * Centralized Amplitude analytics service.
 *
 * Naming conventions:
 * - Event names: Title Case, "Object Past Tense Verb" (e.g., "Task Created")
 * - Event/user properties: lower case with spaces (e.g., "task id", "is recurring")
 *
 * All event tracking goes through typed helpers so names and property shapes
 * are enforced in one place. Import and call these helpers from screens.
 */

import * as amplitude from '@amplitude/analytics-react-native';
import { SessionReplayPlugin } from '@amplitude/plugin-session-replay-react-native';
import { Identify } from '@amplitude/analytics-react-native';
import Constants from 'expo-constants';

const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY ?? '';

let initialized = false;

// ---------------------------------------------------------------------------
// Init / Identity
// ---------------------------------------------------------------------------

export async function initAnalytics() {
  if (initialized || !AMPLITUDE_API_KEY) return;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  await amplitude.init(AMPLITUDE_API_KEY, undefined, {
    appVersion,
    trackingSessionEvents: true,
    disableCookies: true,
  }).promise;

  try {
    await amplitude.add(new SessionReplayPlugin({
      sampleRate: 1,
      enableRemoteConfig: true,
    })).promise;
  } catch (e) {
    console.warn('Session Replay plugin failed to initialize (native module not linked):', e);
  }

  initialized = true;
}

export function setAnalyticsUserId(userId: string) {
  amplitude.setUserId(userId);
}

export function setAnalyticsGroup(householdId: string) {
  amplitude.setGroup('household', householdId);
}

export function resetAnalytics() {
  amplitude.reset();
}

// ---------------------------------------------------------------------------
// User Properties
// ---------------------------------------------------------------------------

export function identifyUser(props: {
  'email'?: string;
  'household id'?: string;
  'competitor id'?: string;
  'competitor name'?: string;
  'competitor color'?: string;
  'has housemate'?: boolean;
  'housemate status'?: string;
  'theme preference'?: string;
  'week end day'?: string;
  'prize set'?: boolean;
  'app version'?: string;
  'days since household creation'?: number;
  'total competitions completed'?: number;
  'total competitions won'?: number;
  'percentage competitions won'?: number;
  'total active competitions'?: number;
  'total active days'?: number;
}) {
  const id = new Identify();
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) {
      id.set(key, value as string | number | boolean);
    }
  }
  amplitude.identify(id);
}

export function identifyUserOnce(props: {
  'is household creator'?: boolean;
}) {
  const id = new Identify();
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) {
      id.setOnce(key, value as string | number | boolean);
    }
  }
  amplitude.identify(id);
}

export function incrementUserProperty(property: string, value: number = 1) {
  const id = new Identify();
  id.add(property, value);
  amplitude.identify(id);
}

export function setUserProperty(property: string, value: string | number | boolean) {
  const id = new Identify();
  id.set(property, value);
  amplitude.identify(id);
}

// ---------------------------------------------------------------------------
// Onboarding Events
// ---------------------------------------------------------------------------

export function trackAppOpened(props: {
  'is first open': boolean;
  'session count': number;
}) {
  amplitude.track('App Opened', props);
}

export function trackOnboardingStarted(props: {
  'entry point': string;
}) {
  amplitude.track('Onboarding Started', props);
}

export function trackAppleSignInStarted(props: {
  flow: string;
}) {
  amplitude.track('Apple Sign In Started', props);
}

export function trackAppleSignInCompleted(props: {
  flow: string;
  'is returning user': boolean;
  'had existing household': boolean;
}) {
  amplitude.track('Apple Sign In Completed', props);
}

export function trackAppleSignInFailed(props: {
  flow: string;
  reason: string;
}) {
  amplitude.track('Apple Sign In Failed', props);
}

export function trackJoinCodeEntered() {
  amplitude.track('Join Code Entered');
}

export function trackHouseholdCreated(props: {
  'household id': string;
  'competitor name': string;
  'competitor color': string;
}) {
  amplitude.track('Household Created', props);
}

export function trackHouseholdJoined(props: {
  'household id': string;
  'competitor name': string;
  'competitor color': string;
}) {
  amplitude.track('Household Joined', props);
}

export function trackJoinCodeFailed(props: {
  'error reason': string;
}) {
  amplitude.track('Join Code Failed', props);
}

// ---------------------------------------------------------------------------
// Task Events
// ---------------------------------------------------------------------------

export function trackTaskCreated(props: {
  'task id': string;
  'competition id': string;
  'template id': string | null;
  'task name length': number;
  'is recurring': boolean;
  'repeat days count': number;
  'has initial points': boolean;
  'day key': string;
  'is today': boolean;
  'task count for day': number;
  source: string;
}) {
  amplitude.track('Task Created', props);
}

export function trackTaskNameChanged(props: {
  'task id': string;
  'template id': string | null;
  'old name length': number;
  'new name length': number;
  scope: string;
  'is recurring': boolean;
  source: string;
}) {
  amplitude.track('Task Name Changed', props);
}

export function trackTaskDeleted(props: {
  'task id': string;
  'template id': string | null;
  'competition id': string;
  method: string;
  scope: string;
  'is recurring': boolean;
  'had points': boolean;
}) {
  amplitude.track('Task Deleted', props);
}

export function trackTaskScored(props: {
  'task id': string;
  'competition id': string;
  'competitor id': string;
  'points value': number;
  'previous points value': number;
  'is self': boolean;
  'is recurring': boolean;
  'day key': string;
  'is today': boolean;
  source: string;
}) {
  amplitude.track('Task Scored', props);
}

export function trackTaskReordered(props: {
  'task id': string;
  'competition id': string;
  'task count for day': number;
}) {
  amplitude.track('Task Reordered', props);
}

export function trackTaskScheduleChanged(props: {
  'task id': string;
  'template id': string | null;
  'old repeat days count': number;
  'new repeat days count': number;
  direction: string;
  'is recurring': boolean;
}) {
  amplitude.track('Task Schedule Changed', props);
}

// ---------------------------------------------------------------------------
// Scoreboard & Prize Events
// ---------------------------------------------------------------------------

export function trackPrizeSet(props: {
  'household id': string;
  'competition id': string;
  'prize length': number;
  'old prize length': number;
  'is first prize': boolean;
  'is suggested': boolean;
  source: string;
}) {
  amplitude.track('Prize Set', props);
}

export function trackPrizeCleared(props: {
  'household id': string;
  'old prize length': number;
  source: string;
}) {
  amplitude.track('Prize Cleared', props);
}

export function trackScoreboardTapped(props: {
  'competitor id': string;
  'competitor position': string;
  'is self': boolean;
}) {
  amplitude.track('Scoreboard Tapped', props);
}

// ---------------------------------------------------------------------------
// Housemate & Invite Events
// ---------------------------------------------------------------------------

export function trackHousemateAdded(props: {
  'household id': string;
  'competitor id': string;
  source: string;
  'housemate name length': number;
}) {
  amplitude.track('Housemate Added', props);
}

export function trackInviteShared(props: {
  'household id': string;
  'competitor id': string;
  source: string;
  'is resend': boolean;
}) {
  amplitude.track('Invite Shared', props);
}

// ---------------------------------------------------------------------------
// Navigation & Screen Events
// ---------------------------------------------------------------------------

export function trackScreenViewed(props: {
  'screen name': string;
}) {
  amplitude.track('Screen Viewed', props);
}

export function trackDaySelected(props: {
  'day key': string;
  'is today': boolean;
  'days from today': number;
  'task count for day': number;
}) {
  amplitude.track('Day Selected', props);
}

export function trackInsightExpanded(props: {
  'competition id': string;
  'week start': string;
  'week end': string;
  'score a': number;
  'score b': number;
  'total tasks': number;
  'has narrative': boolean;
  'weeks ago': number;
}) {
  amplitude.track('Insight Expanded', props);
}

// ---------------------------------------------------------------------------
// Settings Events
// ---------------------------------------------------------------------------

export function trackThemeChanged(props: {
  'old value': string;
  'new value': string;
}) {
  amplitude.track('Theme Changed', props);
}

export function trackWeekEndDayChanged(props: {
  'old value': string;
  'new value': string;
}) {
  amplitude.track('Week End Day Changed', props);
}

export function trackCompetitorNameChanged(props: {
  'competitor id': string;
  'old name length': number;
  'new name length': number;
  'is self': boolean;
  source: string;
}) {
  amplitude.track('Competitor Name Changed', props);
}

export function trackCompetitorColorChanged(props: {
  'competitor id': string;
  'old value': string;
  'new value': string;
  'is self': boolean;
  source: string;
}) {
  amplitude.track('Competitor Color Changed', props);
}

export function trackDataCleared(props: {
  'household id': string;
}) {
  amplitude.track('Data Cleared', props);
}

export function trackUserSignedOut(props: {
  'household id': string;
}) {
  amplitude.track('User Signed Out', props);
}

// ---------------------------------------------------------------------------
// Lifecycle Events
// ---------------------------------------------------------------------------

export function trackChallengeLoaded(props: {
  'competition id': string;
  'household id': string;
  'task count': number;
  'score a': number;
  'score b': number;
  'days remaining': number;
  'has prize': boolean;
  'has housemate': boolean;
}) {
  amplitude.track('Challenge Loaded', props);
}

export function trackWeekCompleted(props: {
  'competition id': string;
  'household id': string;
  'winner is self': boolean;
  'is tie': boolean;
  'score gap': number;
  'self score': number;
  'opponent score': number;
  'total tasks': number;
  'tasks with points': number;
}) {
  amplitude.track('Week Completed', props);
}

// ---------------------------------------------------------------------------
// UX Events
// ---------------------------------------------------------------------------

export function trackUnsavedChangesShown(props: {
  'sheet name': string;       // 'edit task' | 'add task' | 'add prize' | 'competitor' | 'add housemate'
  'action taken': string;     // 'save' | 'discard' | 'keep editing'
  'has name change': boolean;
  'has points change': boolean;
  'has schedule change': boolean;
}) {
  amplitude.track('Unsaved Changes Shown', props);
}
