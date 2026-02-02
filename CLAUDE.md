# House Cup - AI Assistant Context

This file provides quick context for AI assistants working on this codebase.

## What is House Cup?

A React Native mobile app for iOS that gamifies household chores between two partners. Each week is a "challenge" where partners earn points for completing tasks, competing for a prize.

## Tech Stack Quick Reference

- **React Native 0.81 + Expo 54** - Mobile framework
- **TypeScript 5.9** - Language
- **Expo Router 6** - File-based navigation
- **Zustand 5** - State management (3 stores: household, challenge, recurring)
- **Firebase JS SDK** - Real-time sync and persistence (web SDK, works with Expo Go)
- **Firebase Auth** - Anonymous authentication
- **Ionicons** - Icon library (use `@expo/vector-icons`)

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
| Challenge state | `src/store/useChallengeStore.ts` |
| Settings screen | `app/settings.tsx` |
| Firebase config | `src/services/firebase/firebaseConfig.ts` |
| Firestore sync hook | `src/hooks/useFirestoreSync.ts` |
| Firebase provider | `src/providers/FirebaseProvider.tsx` |
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

## Design Opinions (Follow These)

1. **Warm, inviting aesthetic** - Cream backgrounds, coral accent
2. **Simple and delightful** - Minimal UI, clear hierarchy
3. **iOS-first** - Follow iOS Human Interface Guidelines
4. **No emojis** unless user explicitly requests
5. **Competitor colors are user-chosen** - Orange is reserved for app accent
6. **Typography: 6 variants only** - title, display, headline, body, callout, caption

## Current State (January 2026)

### Completed
- Scoreboard with weekly competition
- Day strip navigation
- Task list with point circles
- Add/edit task bottom sheet
- Recurring tasks
- Swipe-to-delete
- Settings (competitors, theme, prize, week end day)
- Firebase/Firestore real-time sync
- Anonymous authentication
- Optimistic UI updates with background sync

### In Progress
- Firebase integration using JS SDK (switched from native SDK due to iOS 26 compatibility)

### Planned
- Stats & History screen
- Onboarding flow
- Household join flow UI

## Gotchas

1. **Theme preference is in Household** - Not a separate store
2. **weekStartDay is internally 0-6** - UI shows "Week ends on" but converts
3. **Templates seed idempotently** - Safe to call seedFromTemplates() anytime
4. **Skip records prevent re-seeding** - Deleted recurring tasks stay deleted
5. **Firebase JS SDK** - Works with Expo Go, no native build required. Set env vars in `.env.local`
6. **Offline mode** - Without Firebase env vars, app runs locally with sample data
7. **Optimistic updates** - Stores update immediately, then sync to Firestore in background
8. **syncEnabled flag** - Each store has a `syncEnabled` flag that controls Firestore writes
9. **Firestore Security Rules** - After changes that add new collections or subcollections, remind user to update Firebase Console rules. Current required rules:

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
