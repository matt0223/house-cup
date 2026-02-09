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

## Key Files to Know

| Purpose | File |
|---------|------|
| Main screen | `app/index.tsx` |
| Theme colors | `src/theme/colors.ts` |
| Task model | `src/domain/models/TaskInstance.ts` |
| Competitor model | `src/domain/models/Competitor.ts` |
| Challenge state | `src/store/useChallengeStore.ts` |
| Settings screen | `app/settings.tsx` |
| Onboarding index | `app/onboarding/index.tsx` |
| Create household | `app/onboarding/create.tsx` |
| Join household | `app/onboarding/join.tsx` |
| Firebase config | `src/services/firebase/firebaseConfig.ts` |
| Firestore sync hook | `src/hooks/useFirestoreSync.ts` |
| Firebase provider | `src/providers/FirebaseProvider.tsx` |
| Household service | `src/services/firebase/householdService.ts` |
| History screen | `app/history.tsx` |
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
- Onboarding: Create (3 steps) or Join (enter code → Apple Sign-In → set profile). No "Continue as Guest."
- Sign out in Settings clears local household and navigates to onboarding.
- **Onboarding redesign planned** — Current 3-step wizard (name → housemate → prize) is being replaced to get users to the aha moment faster.

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
- Day strip navigation
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

### In Progress
- Onboarding V2 (simplified flow to reach aha moment faster)

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

## Gotchas

1. **Theme preference is in Household** - Not a separate store
2. **weekStartDay is internally 0-6** - UI shows "Week ends on" but converts
3. **Templates seed idempotently** - Safe to call seedFromTemplates() anytime; we only run the seed effect when the **set of template IDs** changes (not on every Firestore array reference change) to avoid duplicates
4. **Skip records prevent re-seeding** - Deleted recurring tasks stay deleted; skip records are removed when their template is deleted
5. **Seeded tasks persist to Firestore** - When a recurring task is created, `seedFromTemplates()` creates instances for all applicable days AND persists each to Firestore
6. **Firebase JS SDK** - Works with Expo Go, no native build required. Set env vars in `.env`
7. **Offline mode** - Without Firebase env vars, app runs locally with sample data
8. **Optimistic updates** - Stores update immediately, then sync to Firestore in background
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

## Questions to Ask User

If unclear about something, ask:
1. "Should this match our existing design patterns?"
2. "Is this a V1 feature or planned for later?"
3. "Should this setting persist to the backend eventually?"
