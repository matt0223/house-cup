# House Cup - AI Assistant Context

This file provides quick context for AI assistants working on this codebase.

## GitHub Repository

**URL:** https://github.com/matt0223/house-cup.git

The repository contains the React Native app code. Push changes to `main` branch.

**TestFlight:** App is deployed to TestFlight for beta testing.

## What is House Cup?

A React Native mobile app for iOS that gamifies household chores between two housemates. Each week is a "challenge" where housemates earn points for completing tasks, competing for a fun prize.

### How the Core Loop Works

1. **Tasks** are shared — either housemate can add a task, and both see the same list for each day. Tasks can be pre-planned (like a to-do) or logged after the fact (like a journal entry). They are a hybrid.

2. **Scoring** happens per-task, per-competitor. Each task row shows two tappable score circles (one per competitor, displaying their initial). Tapping cycles through **0 → 1 → 2 → 3 → 0** points. Both competitors can independently score the same task (e.g., if they collaborated on cooking). The point value represents effort/time spent — a quick microwave dinner might be 1 point, an elaborate meal might be 3.

3. **The scoreboard** at the top of the challenge screen shows each competitor's total points for the week, with the prize in the center. It collapses when scrolling through a long task list.

4. **At the end of the week**, the competitor with the most points wins the prize. The app generates an AI-powered narrative recap with insights about the week's patterns.

### The Aha Moment

The magical moment is a **two-beat sequence**:
- **Beat 1**: The user adds their first task (taps a suggestion chip or the "+ Add task" button). A task appears on the list with score circles visible.
- **Beat 2**: The user taps their score circle on that task, cycling it to 1. The scoreboard updates from 0 to 1. This is when the user "gets it" — this isn't a to-do app, it's a game. They're putting points on the board.

The empty competitor score sitting at 0 next to their 1 creates an implicit question: *who's going to catch up?*

**Every design decision should minimize the time between sign-in and this aha moment.**

## Tech Stack Quick Reference

- **React Native 0.81 + Expo 54** - Mobile framework
- **TypeScript 5.9** - Language
- **Expo Router 6** - File-based navigation
- **Zustand 5** - State management (3 stores: household, challenge, recurring)
- **Firebase JS SDK** - Real-time sync and persistence (web SDK, works with Expo Go)
- **Firebase Auth** - Anonymous authentication + Sign in with Apple
- **EAS Build** - Expo Application Services for TestFlight and dev client builds
- **Ionicons** - Icon library (use `@expo/vector-icons`)
- **expo-apple-authentication** - Native Apple Sign-In
- **expo-crypto** - Cryptographic operations for auth nonces

## Amplitude Analytics

The app uses Amplitude for product analytics with Session Replay and Experiment SDKs.

### SDKs
- `@amplitude/analytics-react-native` — Core event tracking
- `@amplitude/plugin-session-replay-react-native` — Session Replay
- `@amplitude/experiment-react-native-client` — Feature flags / A/B tests

### Architecture
- **Centralized service:** `src/services/analytics.ts` — All event definitions with typed helpers. Never call `amplitude.track()` directly; use typed wrappers like `trackTaskCreated()`.
- **Initialization:** `FirebaseProvider` calls `initAnalytics()` on mount. User identity (userId, householdId group, user properties) is set when auth and household resolve.
- **API Key:** `EXPO_PUBLIC_AMPLITUDE_API_KEY` in all `.env` files and `eas.json` profiles.

### Naming Conventions
- **Event names:** Title Case, "Object Past Tense Verb" (e.g., "Task Created", "Day Selected")
- **Event/user properties:** lower case with spaces (e.g., "task id", "is recurring", "household id")

### Event Catalog
| Event | Where Tracked |
|-------|--------------|
| Screen Viewed | `app/index.tsx`, `app/settings.tsx`, `app/history.tsx`, onboarding screens |
| Onboarding Started | `app/onboarding/index.tsx` |
| Apple Sign In Started/Completed/Failed | `app/onboarding/index.tsx`, `app/onboarding/join.tsx` |
| Join Code Entered | `app/onboarding/index.tsx` |
| Household Created/Joined | `app/onboarding/index.tsx`, `app/onboarding/join.tsx` |
| Join Code Failed | `app/onboarding/join.tsx` |
| Task Created/Edited/Deleted/Scored/Reordered | `app/index.tsx` |
| Task Converted to Recurring/One Off | `app/index.tsx` |
| Prize Set/Cleared | `app/index.tsx`, `app/settings.tsx` |
| Housemate Added | `app/index.tsx`, `app/settings.tsx` |
| Invite Shared | `app/index.tsx`, `app/settings.tsx` |
| Scoreboard Tapped | `app/index.tsx` |
| Day Selected | `app/index.tsx` |
| Insight Expanded | `app/history.tsx` |
| Setting Changed | `app/settings.tsx` |
| Data Cleared | `app/settings.tsx` |
| User Signed Out | `app/settings.tsx` |
| Challenge Loaded | `app/index.tsx` |
| Week Completed | `src/services/firebase/challengeService.ts` |

### Adding New Events
1. Add a typed helper function to `src/services/analytics.ts`
2. Import and call it from the relevant screen/component
3. Update this table in CLAUDE.md

## Firebase Projects (Dev vs Prod)

The app uses **two separate Firebase projects** to isolate development data from production:

| Project | Firebase Project ID | Bundle ID | Purpose |
|---------|---------------------|-----------|---------|
| **Production** | `house-cup-3e1d7` | `com.kabusworks.housecup` | TestFlight/App Store |
| **Development** | `house-cup-dev` | `com.kabusworks.housecup.dev` | Local dev/testing |

### Environment Files

```
.env                 # Default - points to house-cup-dev (for npx expo start)
.env.development     # Same as .env (dev Firebase config)
.env.production      # Production Firebase config (for reference)
eas.json             # Build-time env vars per profile
```

**Important:** Don't create `.env.local` - it takes precedence and can cause config mismatches.

### Development Workflow

```bash
# Start dev server (uses .env → house-cup-dev)
npx expo start --dev-client

# Build dev client (uses eas.json development profile)
eas build --profile development --platform ios

# Build for TestFlight (uses eas.json production profile)
eas build --profile production --platform ios
```

## Critical Patterns

### 0. Stay Strictly On-Topic
**Only do what the user's most recent message asks for.** Do not carry forward unanswered questions from earlier messages, do not proactively investigate or comment on unrelated features, and do not provide unsolicited analysis or suggestions beyond the scope of the current request. If the user asks you to implement X, implement X and nothing else. If something seems related but wasn't asked about, do not mention it.

### 1. Always Use Theme Tokens
```typescript
// Good
const { colors, spacing, typography } = useTheme();
<View style={{ padding: spacing.sm, backgroundColor: colors.surface }}>
  <Text style={[typography.body, { color: colors.textPrimary }]}>

// Bad - never hard-code
<View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
```

### 2. dayKey Format
All dates are `yyyy-MM-dd` strings. Never use Date objects for storage.
```typescript
const dayKey = '2026-01-29'; // Correct
```

### 3. Domain Logic is Pure
Business logic in `src/domain/services/` has no React dependencies.
```typescript
// Good - pure function
export function calculateChallengeScores(tasks, competitors): ChallengeScores

// Bad - don't put React hooks in domain
```

### 4. Components Have Barrel Files
Always add new components to their `index.ts`:
```typescript
// src/components/ui/index.ts
export { MyNewComponent } from './MyNewComponent';
```

### 5. Feature vs UI Components
- `src/components/features/` - Business-specific (AddTaskSheet, ScoreboardCard)
- `src/components/ui/` - Reusable primitives (Button, Card, DayStrip)

### 6. Amplitude Analytics on Every New Feature
**Whenever building any new feature, screen, or user interaction**, automatically add Amplitude tracking:
1. Add a `trackScreenViewed({ 'screen name': '...' })` call in a `useEffect` on mount for every new screen.
2. Add typed event helpers to `src/services/analytics.ts` for every new user action (following "Object Past Tense Verb" Title Case naming for events, lower case with spaces for properties).
3. Include relevant unique identifiers (`task id`, `household id`, `competition id`, `competitor id`, `template id`) in event properties for funnel analysis.
4. Reuse existing property names from the Cross-Event Property Glossary (see analytics plan) — never create synonyms (e.g., always `"task id"`, never `"taskId"` or `"task identifier"`).
5. Never call `amplitude.track()` directly — always use the typed wrappers in `src/services/analytics.ts`.
6. Verify new tracking doesn't duplicate or conflict with existing events. Check the Event Catalog table in this file.
7. Update the Event Catalog table in this file when adding new events.

## Key Files to Know

| Purpose | File |
|---------|------|
| Main screen | `app/index.tsx` |
| Scoreboard / Prize circle | `src/components/features/MorphingScoreboard.tsx` |
| Theme colors | `src/theme/colors.ts` |
| Task model | `src/domain/models/TaskInstance.ts` |
| Competitor model | `src/domain/models/Competitor.ts` |
| Challenge state | `src/store/useChallengeStore.ts` |
| Task list (drag-to-reorder) | `src/components/features/TaskList.tsx` |
| Task row (grip icon, points) | `src/components/features/TaskRow.tsx` |
| Swipeable row wrapper | `src/components/features/SwipeableTaskRow.tsx` |
| Task Firestore service | `src/services/firebase/taskService.ts` |
| Settings screen | `app/settings.tsx` |
| Onboarding index | `app/onboarding/index.tsx` |
| Join household | `app/onboarding/join.tsx` |
| Firebase config | `src/services/firebase/firebaseConfig.ts` |
| Firestore sync hook | `src/hooks/useFirestoreSync.ts` |
| Firebase provider | `src/providers/FirebaseProvider.tsx` |
| Household service | `src/services/firebase/householdService.ts` |
| History screen | `app/history.tsx` |
| Analytics service | `src/services/analytics.ts` |
| Cloud Functions | `functions/src/index.ts` |
| Firebase setup guide | `docs/FIREBASE_SETUP.md` |

## Common Tasks

### Adding a New Setting
1. Add field to `Household` interface in `src/domain/models/Household.ts`
2. Add to `updateSettings` type in `src/store/useHouseholdStore.ts`
3. Add UI in `app/settings.tsx`

### Adding a New UI Component
1. Create file in `src/components/ui/NewComponent.tsx`
2. Export from `src/components/ui/index.ts`
3. Use theme tokens, never hard-coded values

### Adding Domain Logic
1. Add pure function in `src/domain/services/`
2. Export from `src/domain/services/index.ts`
3. Add tests in `src/domain/__tests__/`

### Modifying Firebase Data Model
1. Update interface in `src/domain/models/`
2. Update Firestore service in `src/services/firebase/`
3. Update sample data if needed
4. Check if Firestore security rules need updating

### Building for TestFlight
```bash
cd rn-app
eas build --platform ios --profile production
eas submit --platform ios
```
Then approve in App Store Connect TestFlight tab.

## Product Principles (Follow These)

### Experience Principles
1. **Get to the aha moment fast** — Every screen, field, or step between sign-in and the first scored task is friction. Eliminate or defer anything that isn't essential to reaching that moment.
2. **Value before commitment** — Let users experience the product before asking them to invest (invite a housemate, set a prize, configure settings). Show, don't tell.
3. **Progressive disclosure** — Don't front-load configuration. Introduce features contextually when the user needs them, not all at once during onboarding.
4. **Smart defaults over explicit choices** — Default the prize, default the color, pre-fill the name from Apple. Let users customize later from Settings. The best onboarding question is the one you don't ask.
5. **Everything presented must be highly valuable** — No filler content, no mediocre insights, no repeated tips. If it's not genuinely useful or delightful, omit it entirely. An empty state is better than a low-quality one.
6. **Collaborative competition, not adversarial** — The tone is playful, not hostile. The real goal is household momentum: visibility into what's getting done, motivation to contribute, and insights to improve efficiency. The competition is the vehicle, not the destination.
7. **The product IS the onboarding** — The best way to teach a user how the app works is to let them use it. Contextual guidance within the real UI beats tutorial screens every time.

### Design Opinions
1. **Warm, inviting aesthetic** - Cream backgrounds, coral accent
2. **Simple and delightful** - Minimal UI, clear hierarchy
3. **iOS-first** - Follow iOS Human Interface Guidelines
4. **No emojis** unless user explicitly requests
5. **Competitor colors are user-chosen** - Orange is reserved for app accent
6. **Typography: 6 variants only** - title, display, headline, body, callout, caption

## Current State (February 2026)

### Auth & Onboarding
- **Sign in with Apple only** - No guest mode, no "Link Apple Account" in Settings. User must sign in with Apple before seeing the household (onboarding and join flow both require Apple Sign-In). Keeps identity simple and avoids orphaned anonymous users.
- Onboarding: Welcome screen → Apple Sign-In → auto-create household → main app. Or: "Have a join code?" → enter code → Apple Sign-In → auto-join household.
- The old 3-step create wizard (`app/onboarding/create.tsx`) has been **removed** — it was dead code, never navigated to.
- Sign out in Settings clears local household and navigates to onboarding.

### Recurring Tasks (Important for UX and Bugs)
- **New recurring task with points:** We create the template, then **one anchor task** for the selected day with points via `addTask(name, points, templateId)`. Seeding fills other days; seeding never overwrites existing `(templateId, dayKey)`.
- **Convert one-off → recurring:** We `addTemplate` + `linkTaskToTemplate` (and persist the link to Firestore). A **seed-skip anchor** (`seedSkipAnchor`) ensures we don’t seed the anchor day even if a stale Firestore snapshot overwrote the link. **Seed runs only when the set of template IDs actually changes** (not on every Firestore sync reference change), so we avoid duplicate tasks on the other recurring days.
- **Skip records:** Stored in both challenge and recurring stores; Firestore sync updates both so seeding always sees the latest. When a template is deleted, its skip records are removed from Firestore and local state (no orphaned skip records).
- **Recurring icon:** Shown only if the task has a `templateId` **and** that template exists in `templates` **and** the template has `repeatDays.length > 0` (so detached/kept tasks don’t show the icon).

### Data & Sync
- **Clear all task data:** Settings → Data → "Clear all tasks and templates" deletes all tasks, templates, and skip records from Firestore for the current household and resets challenge + recurring stores. Household and competitors are unchanged. Use for testing or fresh start.
- All task/template/skip-record edits (name, points, detach, convert to one-off) persist to Firestore when sync is enabled.
- Optimistic updates first, then Firestore; subscriptions overwrite local state when Firestore changes.

### Completed
- Scoreboard with weekly competition (collapsible with scroll animation)
- Day strip navigation (always visible, outside scroll area)
- Task list with point circles (tap to cycle 0→1→2→3→0 per competitor)
- Add/edit task bottom sheet
- Recurring tasks (with anchor + seed, convert one-off, no duplicates)
- Swipe-to-delete (recurring: "This and all without points" option)
- Settings (competitors, theme, prize, week end day, clear-all data)
- Firebase/Firestore real-time sync
- **Sign in with Apple only** (no anonymous, no guest)
- **Dev/Prod Firebase separation** - Two Firebase projects with distinct bundle IDs
- **TestFlight deployment** - App is live on TestFlight
- **Sign out** - In Settings
- **History & Insights screen** - Weekly history cards with AI-generated narratives
- **Firebase Cloud Functions** - `completeExpiredChallenges` (hourly backup) and `onChallengeCompleted` (OpenAI narrative generation via gpt-4o-mini)
- **Client-side challenge completion** - Detects expired challenges on app open, completes them atomically, creates next week's challenge
- **Smart insight tips** - Only surfaces tips for new/spiking tasks (not baseline recurring tasks), avoids repetition across weeks
- **Contextual toast notifications** - "Task added", "Task updated", "Task deleted", "Settings updated", "Invite sent"
- **Scrolling day picker** - Header fades out on scroll, scoreboard collapses, day strip stays pinned, task list scrolls in a rounded-corner window beneath
- **Drag-to-reorder tasks** - Grip icon (8-dot vertical drag handle) on each task row; long-press grip → drag to reorder. Uses absolute positioning with shared-value positions map for flash-free 60fps animations. Displaced rows animate smoothly via `withSpring`. Insertion line shows drop target. Floating task gets reduced opacity + shadow. Order persists via `sortOrder` field to Firestore.
- **Stable task ordering (`sortOrder`)** - Tasks have a `sortOrder` field. New tasks get `max + 1` so they appear at the bottom. UI sorts by `sortOrder` with `createdAt` fallback for legacy tasks.
- **Task list fade-in on load** - Task list fades in (opacity 0→1) and slides up (10px translateY) over 350ms with `Easing.out(Easing.ease)` when tasks finish loading. Prevents the empty-state flash that occurred while Firestore tasks were still loading. The empty state ("What needs doing today?") only renders once `tasksReady` is true and the task array is empty.
- **Smooth prize circle morph** - Prize circle collapses/expands without text shuffling. Text has a fixed width (`PRIZE_CIRCLE_EXPANDED - PRIZE_BORDER_EXPANDED * 2`), no `numberOfLines` limit, and the circle has `overflow: 'hidden'`. Text fades with opacity only (no `maxHeight` animation). A `translateY` shift on the content group (trophy + text) moves it down as text fades so the trophy stays centered in the collapsed circle.

- **Amplitude Analytics** — Full event instrumentation with Session Replay. Events, user properties, and group properties are tracked via a centralized service (`src/services/analytics.ts`). Initialized in `FirebaseProvider` on mount; identity set when auth/household resolve.

### Planned
- Push notifications for reminders
- Achievements and streaks

## Pending Housemate Feature (Important!)

When a user creates a household and invites a housemate:

1. **Both competitors are created immediately** - The housemate gets a `Competitor` with name + color but no `userId`
2. **Points can be logged for pending housemate** - They appear on scoreboard with their score
3. **Paper-plane icon** - Shows next to pending housemate's name for resending invites
4. **When housemate joins** - Their `userId` is linked to the existing competitor (not creating a new one)

### Data Model

```typescript
interface Competitor {
  id: string;
  name: string;
  color: string;
  userId?: string;  // undefined = pending (hasn't joined)
}

// Helper function
isPendingCompetitor(competitor): boolean  // returns !competitor.userId
```

**Note:** `Household.pendingHousemateName` has been REMOVED. The pending housemate's name is stored in their `Competitor` object.

## Recurring Tasks Feature (Important!)

Recurring tasks allow users to create tasks that repeat on specific days of the week.

### Data Model

```typescript
interface RecurringTemplate {
  id: string;
  name: string;
  repeatDays: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  householdId: string;
}

interface TaskInstance {
  id: string;
  challengeId: string;
  dayKey: DayKey;         // yyyy-MM-dd
  name: string;
  templateId?: string;    // Links to RecurringTemplate (null for one-off tasks)
  originalName?: string;  // For detecting renames
  points: Record<string, number>;  // competitorId -> points
  sortOrder?: number;     // Position in task list (lower = higher). New tasks get max+1 (bottom).
}

interface SkipRecord {
  templateId: string;
  dayKey: DayKey;
}
```

### Creation Flow

1. User creates recurring task with repeat days (e.g., daily = [0,1,2,3,4,5,6])
2. `addTemplate()` creates `RecurringTemplate` → persists to Firestore
3. `addTask(name, points, newTemplate.id)` creates ONE anchor `TaskInstance` for the selected day (with points) → persists to Firestore
4. `seedFromTemplates()` triggers via useEffect **only when the set of template IDs actually changes** (avoids duplicate seed when Firestore sync sends same templates with new reference)
5. `seedTasks()` creates instances for other applicable days (skips anchor day; uses `seedSkipAnchor` if we just converted one-off→recurring)
6. Each seeded instance is persisted to Firestore

### Seeding Rules

- Only seeds for days in the current challenge window (week)
- Checks `shouldRepeatOnDay(template, dayOfWeek)` for each day
- Skips if `TaskInstance` with same `templateId:dayKey` already exists
- Skips if `SkipRecord` exists for that `templateId:dayKey`
- Idempotent: safe to call multiple times

### Skip Records

Skip records prevent re-seeding of deleted task instances:
- Created when user deletes a recurring task instance ("delete this day only")
- Created when user detaches a task from its template ("edit this day only")
- **Deleted when their template is deleted** (no orphaned skip records)
- Held in both challenge store (for seeding) and recurring store (synced from Firestore); when Firestore skip records update, both stores are updated so seeding sees the latest
- Checked during seeding to prevent recreating deleted/detached instances

### Key Files

| Purpose | File |
|---------|------|
| Template store | `src/store/useRecurringStore.ts` |
| Seeding logic | `src/domain/services/seeding.ts` |
| seedFromTemplates | `src/store/useChallengeStore.ts` |
| Auto-seed trigger | `app/index.tsx` (useEffect) |

## Drag-to-Reorder Architecture (TaskList.tsx)

The task list uses an **absolute-positioning + shared-value positions map** pattern (the standard approach for flash-free drag-to-reorder in React Native). Key points:

1. **Positions map** — A Reanimated `useSharedValue<Record<string, number>>` maps each task ID to its slot index. This lives entirely on the UI thread.
2. **Absolute positioning** — Each row is `position: 'absolute'` with a `top` shared value = `slot * ROW_HEIGHT`. The Card container has an explicit `height: ROW_HEIGHT * tasks.length`.
3. **During drag** — The dragged row's `top` follows the finger directly. When it crosses into a new slot, `objectSwap()` updates the positions map. Displaced rows react via `useAnimatedReaction` and animate with `withSpring`.
4. **On drop** — The dragged row animates to snap into its final slot with `withSpring`. No React re-render happens during any animation — this eliminates the flash-to-origin issue.
5. **Commit to React** — Only after the spring animation settles, `onDragEnd` reads the positions map, sorts the tasks array, and calls `onReorder()` to update the Zustand store.
6. **Grip-only activation** — The pan gesture is disabled by default. The grip icon's `onLongPress` (in TaskRow) sets `draggingTaskId` React state, which enables the pan gesture on that specific row. This prevents drag from interfering with swipe-to-delete, tap-to-edit, or parent scroll.
7. **External sync** — When the tasks array changes from outside (add/delete/day change), the component detects the ID list change and rebuilds the positions map.

### Visual feedback during drag:
- **Insertion line** — 2px coral line appears between rows at the drop target position
- **Float effect** — Dragged row gets reduced opacity (0.5) and shadow, animated smoothly with `withTiming` only once the pan gesture activates (not on grip long-press alone)
- **Grip icon** — 8-dot vertical drag handle (`MaterialCommunityIcons drag-vertical`) at 16px, 50% opacity

### Key constraint:
- All rows must have the **same height** (measured from the first row's `onLayout`). Variable-height rows would require a more complex positions calculation.

## Challenge Screen Layout (Important — Regressions Happen Here)

The main screen (`app/index.tsx`) has a specific scroll-linked layout that must be preserved:

```
SafeAreaView
  ├── Header (Animated.View, height 48→0, opacity 1→0 on scroll)
  ├── CollapsibleScoreboard (MorphingScoreboard, morphs expanded→collapsed)
  ├── DayStrip (Animated.View, always visible, OUTSIDE ScrollView)
  └── Rounded scroll window (View, overflow:hidden, borderTopRadius:16, surface bg)
        └── Animated.ScrollView (tasks only)
```

### Key behaviors:
1. **Header** fades out (opacity → 0 over first 25% of scroll) and its container collapses (height → 0 over first 60%). This is faster than the scoreboard collapse so the header is gone before the scoreboard finishes.
2. **Scoreboard** morphs from expanded to collapsed over 110px of scroll (COLLAPSE_THRESHOLD in MorphingScoreboard.tsx). Prize circle shrinks, scores rearrange, names transition.
3. **DayStrip** is a sibling element between the scoreboard and the scroll window — NOT inside the ScrollView. It stays visible at all times so users can switch days while scrolling.
4. **Gap between DayStrip and tasks** is persistent (paddingBottom: 16 on DayStrip container). The gap between the scoreboard and DayStrip animates from 16→8px when collapsed.
5. **Rounded scroll window** has `overflow: 'hidden'`, `borderTopLeftRadius` + `borderTopRightRadius` matching `radius.large` (16px), `marginHorizontal: spacing.sm`, and `backgroundColor: colors.surface`. This creates visible rounded corners where tasks scroll into view.
6. **Task list wrapper** inside the ScrollView has NO `paddingHorizontal` or `marginTop` — the rounded window container handles the horizontal inset and the DayStrip handles the vertical gap.

### Common regressions to watch for:
- **DayStrip inside ScrollView** — If DayStrip is placed inside the ScrollView, it scrolls away and users can't switch days. It must be a sibling ABOVE the ScrollView.
- **Missing persistent gap** — If the gap between DayStrip and tasks is inside the ScrollView (as marginTop or paddingTop on content), it scrolls away. The gap must be on the DayStrip's paddingBottom (outside scroll).
- **Invisible rounded corners** — The scroll window needs `backgroundColor: colors.surface` and `marginHorizontal: spacing.sm` to match the Card's inset. Without these, rounded corners clip transparent space and are invisible.
- **Header icons clipping** — The header container uses both height collapse AND opacity fade. Without the opacity fade, the settings/insights icons get visually clipped in half as the container shrinks.
- **Scroll-linked animations not firing** — If the task list is wrapped in a third-party container (e.g., `NestableScrollContainer`) that overwrites the `onScroll` prop, the `scrollY` Animated.Value won't update and all header/scoreboard collapse animations break. The scroll handler must remain the one wired to `scrollY.setValue()`.
- **Drag-to-reorder breaking other gestures** — The pan gesture for reordering must be scoped to the grip icon only (via long-press activation on that specific row). If the pan gesture is enabled on the whole row, it will block swipe-to-delete and parent scroll.
- **Prize circle text shuffling** — The prize text must have a fixed width and NO `numberOfLines` prop. If `maxHeight` is animated on the text container, the text will reflow/shuffle at intermediate heights. Only use opacity to fade the text and `translateY` on the content group to keep the trophy centered. The circle itself handles clipping via `overflow: 'hidden'`.
- **Empty-state flash on app load** — The task list content must be wrapped in a fade animation gated by `tasksReady`. Without this, the "What needs doing today?" empty state flashes before Firestore tasks arrive.

## Gotchas

1. **Theme preference is in Household** - Not a separate store
2. **weekStartDay is internally 0-6** - UI shows "Week ends on" but converts
3. **Templates seed idempotently** - Safe to call seedFromTemplates() anytime; we only run the seed effect when the **set of template IDs** changes (not on every Firestore array reference change) to avoid duplicates
4. **Skip records prevent re-seeding** - Deleted recurring tasks stay deleted; skip records are removed when their template is deleted
5. **Seeded tasks persist to Firestore** - When a recurring task is created, `seedFromTemplates()` creates instances for all applicable days AND persists each to Firestore
6. **Firebase JS SDK** - Works with Expo Go, no native build required. Set env vars in `.env`
7. **Offline mode** - Without Firebase env vars, app runs locally with sample data
8. **Optimistic updates** - Stores update immediately, then sync to Firestore in background
8a. **reorderTasks persists via batch write** - `updateTaskSortOrders()` in taskService.ts uses a Firestore `writeBatch` to update all `sortOrder` values atomically
9. **syncEnabled flag** - Each store has a `syncEnabled` flag that controls Firestore writes
10. **Pending competitor has no userId** - Check with `isPendingCompetitor(competitor)` helper
11. **Join flow claims existing competitor** - Uses `claimCompetitorSlot()`, not `addCompetitorToHousehold()`
12. **Onboarding redirects** - `app/index.tsx` redirects to `/onboarding` if no `householdId`
13. **Don't create .env.local** - It loads first and overrides other env files
14. **Dev client vs Expo Go** - Sign in with Apple requires dev client (native modules)
15. **Apple Sign-In requires Firebase config** - Must configure Services ID, Team ID, Key ID, and private key in Firebase Console → Authentication → Apple
16. **Firestore indexes** - New Firebase projects need indexes created (click link in error)
17. **Firestore Security Rules** - After changes that add new collections or subcollections, remind user to update Firebase Console rules. Current required rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{householdId} {
      allow read, write: if request.auth != null;
      
      match /{subcollection=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

If user sees "Missing or insufficient permissions" errors, provide these rules.

## Lessons Learned (Feb 2026)

These are hard-won lessons from implementation. Preserve for future reference:

### Drag-to-Reorder
1. **Don't use `react-native-draggable-flatlist` with a parent ScrollView** — It takes over gestures and blocks parent scrolling. `NestableScrollContainer` "fixes" nesting but overwrites `onScroll`, breaking any scroll-linked animations.
2. **`useAnimatedGestureHandler` is removed in Reanimated v4** — Use `Gesture.Pan()` from `react-native-gesture-handler` + `GestureDetector` instead.
3. **translateY-based reorder will flash on drop** — When a dragged item's `translateY` resets to 0 (UI thread) before React re-renders with the new order (JS thread), the item visually teleports to its origin. The fix is absolute positioning with a shared-value positions map so everything stays on the UI thread.
4. **`setChallenge` must be idempotent for the same ID** — If it clears tasks/state when called with the same challenge ID (common on Firestore re-sync), all tasks disappear. Guard with `if (newId === currentId) return` or preserve task arrays.
5. **Create template before task for recurring tasks** — If `addTask` runs before the template is created, the task starts with `templateId: null`, and seeding creates duplicates because it doesn't see the anchor.
6. **`sortOrder` should be per-day** — Each day's tasks have independent `sortOrder` values starting from 0. The `reorderTasks` action only touches the selected day's tasks.
7. **`Gesture.Pan().activateAfterLongPress(150)` fixes first-touch failure** — Using `TouchableOpacity.onLongPress` to enable a pan gesture causes the first drag attempt to fail because the ScrollView claims the gesture during the 150ms delay before React state updates. Combining long-press and pan into a single gesture via `activateAfterLongPress` solves this.
8. **Tight spring on drop feels better** — `damping: 100, stiffness: 300` gives a clean snap with no visible bounce. The default spring (`damping: 20, stiffness: 200`) oscillates visibly for several seconds.

### Animations & Morphing
9. **Never animate `maxHeight` on text containers** — Changing maxHeight causes text reflow/ellipsis at intermediate heights, creating visible "shuffling" even with `overflow: 'hidden'`. Instead, use opacity for fading and `translateY` for repositioning.
10. **Fixed text width prevents reflow during parent resize** — When a container (like the prize circle) animates its size, text inside will reflow unless given a fixed width matching the expanded state. Set `width` explicitly on the text container.
11. **Use `translateY` to re-center content when invisible elements take flex space** — When text fades via opacity but still occupies layout space, the visible content (e.g., trophy icon) shifts off-center. A `translateY` interpolation that shifts the content group compensates without changing layout, which avoids triggering reflow.
12. **React hook order violations from conditional returns** — `useRef`/`useEffect` hooks must be placed above ALL early `return` statements in a component. Placing them after conditional `return <Redirect />` or `return <ActivityIndicator />` causes "Rendered more hooks" errors.
13. **Prevent empty-state flash on load** — Don't render the empty state until data has actually loaded. Use a `tasksReady` flag (e.g., `tasksLoadedForChallengeId === challenge?.id`) and only show empty state when ready AND task array is empty. Wrap content in an animated fade+slide for polish.

## Questions to Ask User

If unclear about something, ask:
1. "Should this match our existing design patterns?"
2. "Is this a V1 feature or planned for later?"
3. "Should this setting persist to the backend eventually?"
