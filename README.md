# House Cup

A mobile-native iOS app that turns household chores into a fun weekly competition between partners.

## Vision

House Cup gamifies household responsibilities by letting two partners earn points for completing shared tasks. Each week is a "challenge" with a prize on the line. The app emphasizes simplicity, delight, and a local-first approach to ensure reliability.

**Core Value Proposition:** Make household chores feel less like obligations and more like a friendly competition that brings partners closer together.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router 6 |
| State Management | Zustand 5 |
| Backend | Firebase (Firestore + Anonymous Auth) |
| Build | EAS Build (TestFlight deployment) |
| Gestures | react-native-gesture-handler + reanimated |
| Testing | Jest |

## Project Structure

```
rn-app/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with ThemeProvider
│   ├── index.tsx          # Main Challenge screen
│   ├── history.tsx        # Stats & History screen (placeholder)
│   ├── settings.tsx       # Settings screen
│   └── onboarding/        # Onboarding flow
│       ├── _layout.tsx    # Onboarding stack layout
│       ├── index.tsx      # Landing (Create/Join choice)
│       ├── create.tsx     # 3-step household creation
│       └── join.tsx       # 2-step join via code
│
├── src/
│   ├── components/
│   │   ├── features/      # Feature-specific components
│   │   │   ├── AddTaskSheet.tsx    # Bottom sheet for add/edit tasks
│   │   │   ├── ScoreboardCard.tsx  # Weekly score display
│   │   │   ├── TaskList.tsx        # Task list container
│   │   │   ├── TaskRow.tsx         # Individual task row
│   │   │   └── SwipeableTaskRow.tsx # Swipe-to-delete wrapper
│   │   │
│   │   └── ui/            # Reusable UI primitives
│   │       ├── AppHeader.tsx       # Screen header
│   │       ├── DayStrip.tsx        # Horizontal day picker
│   │       ├── Card.tsx            # Container card
│   │       ├── AddTaskButton.tsx   # Floating action button
│   │       ├── ConfirmationModal.tsx # Confirmation dialogs
│   │       └── ... (20+ components)
│   │
│   ├── domain/            # Business logic (pure functions)
│   │   ├── models/        # TypeScript interfaces
│   │   │   ├── Household.ts      # Household + settings
│   │   │   ├── Competitor.ts     # Partner entity
│   │   │   ├── Challenge.ts      # Weekly challenge period
│   │   │   ├── TaskInstance.ts   # Task for a specific day
│   │   │   ├── RecurringTemplate.ts # Repeating task pattern
│   │   │   └── SkipRecord.ts     # Tracks deleted instances
│   │   │
│   │   └── services/      # Pure business logic functions
│   │       ├── dayKey.ts         # Date utilities (yyyy-MM-dd format)
│   │       ├── weekWindow.ts     # Week boundary calculations
│   │       ├── seeding.ts        # Task seeding from templates
│   │       └── scoring.ts        # Point calculations
│   │
│   ├── store/             # Zustand stores
│   │   ├── useHouseholdStore.ts  # Household + settings
│   │   ├── useChallengeStore.ts  # Current challenge + tasks
│   │   └── useRecurringStore.ts  # Recurring templates
│   │
│   ├── services/          # External service integrations
│   │   └── firebase/      # Firestore services
│   │       ├── firebaseConfig.ts    # Firebase initialization
│   │       ├── householdService.ts  # Household CRUD
│   │       ├── challengeService.ts  # Challenge CRUD
│   │       └── taskService.ts       # Task CRUD
│   │
│   ├── providers/         # React context providers
│   │   └── FirebaseProvider.tsx  # Auth + household management
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useFirestoreSync.ts   # Real-time Firestore sync
│   │   └── useStepAnimation.ts   # Onboarding step transitions
│   │
│   └── theme/             # Design system
│       ├── colors.ts      # Color tokens (light/dark)
│       ├── typography.ts  # Text styles
│       ├── spacing.ts     # Spacing scale
│       ├── radius.ts      # Border radii
│       ├── shadows.ts     # Shadow presets
│       ├── ThemeContext.tsx # Theme preference provider
│       └── useTheme.ts    # Theme hook
│
└── assets/                # Fonts and images
```

## Domain Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOUSEHOLD                                │
│  - Two Competitors (partners)                                   │
│  - Timezone, weekStartDay, prize, themePreference               │
└─────────────────────────────────────────────────────────────────┘
         │
         │ owns
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RECURRING TEMPLATES                         │
│  - name: "Unload dishwasher"                                    │
│  - repeatDays: [0,1,2,3,4,5,6] (which weekdays)                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │ seeds (idempotently)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CHALLENGE                                │
│  - Weekly period (startDayKey → endDayKey)                      │
│  - Prize for the winner                                         │
│  - Contains TaskInstances                                       │
└─────────────────────────────────────────────────────────────────┘
         │
         │ contains
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TASK INSTANCES                              │
│  - dayKey: "2026-01-29" (specific day)                          │
│  - name: "Exercise"                                             │
│  - templateId: link to recurring (or null for one-off)          │
│  - points: { "competitor-a": 2, "competitor-b": 1 }             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **dayKey** | Canonical date format `yyyy-MM-dd` used throughout the app |
| **Challenge** | A 7-day competition period with a prize |
| **TaskInstance** | A task on a specific day (either one-off or seeded from template) |
| **RecurringTemplate** | Defines a task that repeats on specified weekdays |
| **SkipRecord** | Prevents re-seeding a deleted recurring instance |
| **Seeding** | Process of creating TaskInstances from templates (idempotent) |

## Design System

### Typography (6 variants)

| Variant | Size | Weight | Usage |
|---------|------|--------|-------|
| `title` | 28pt | Bold | App header "House Cup" |
| `display` | 48pt | Bold | Large score numbers |
| `headline` | 17pt | Semibold | Section titles, buttons |
| `body` | 17pt | Regular | Task names, content |
| `callout` | 15pt | Regular | Secondary info, dates |
| `caption` | 13pt | Regular | Labels, smallest text |

### Spacing (4pt base)

```
xxxs: 4pt   xxs: 8pt   xs: 12pt   sm: 16pt
md: 20pt   lg: 24pt   xl: 32pt   xxl: 48pt
```

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | #FAF8F5 (warm cream) | #1C1917 | Screen backgrounds |
| `surface` | #FFFFFF | #292524 | Cards, sheets |
| `primary` | #E8836D (coral) | #E8836D | App accent, buttons |
| `prize` | #E9B44C (gold) | #E9B44C | Trophy icon |
| `textPrimary` | #1A1A1A | #FAFAFA | Main text |
| `textSecondary` | #8E8E93 | #8E8E93 | Supporting text |

**Important:** Competitor colors are NOT in the theme. They come from the Competitor object and are user-configurable. Orange is reserved for the app's primary accent.

### Theme Preference

Users can choose:
- **System** - Follow device light/dark mode
- **Light** - Always light mode
- **Dark** - Always dark mode

This is stored in `household.themePreference` and provided via `ThemeContext`.

## Architecture Decisions

### 1. Local-First Strategy with Firebase Sync

**Decision:** All data is stored locally first with optimistic updates. Firebase Firestore provides real-time sync.

**Rationale:** Ensures the app works reliably offline and feels instant. Firebase JS SDK enables real-time sync across devices without native builds.

### 2. Domain-Driven Design

**Decision:** Business logic lives in `src/domain/` as pure functions, separate from React components and state management.

**Rationale:** Makes logic testable, reusable, and framework-agnostic. The domain layer has no React dependencies.

### 3. Zustand for State

**Decision:** Use Zustand instead of Redux or Context.

**Rationale:** Minimal boilerplate, excellent TypeScript support, and simple mental model. Stores are composable and focused.

### 4. Idempotent Seeding

**Decision:** Task seeding from templates is idempotent — calling it multiple times is safe.

**Rationale:** Simplifies initialization logic. The app can re-seed on every mount without creating duplicates.

### 5. Skip Records for Deletion

**Decision:** When a recurring task instance is deleted, a SkipRecord is created to prevent re-seeding.

**Rationale:** Without this, deleted tasks would reappear after re-seeding. SkipRecords preserve user intent.

### 6. dayKey Format

**Decision:** All dates are stored as `yyyy-MM-dd` strings (dayKey format).

**Rationale:** Simple, timezone-aware (calculated from household timezone), sortable, and human-readable.

### 7. Thin Screens, Fat Components

**Decision:** Screen files (`app/*.tsx`) are orchestrators. Business logic lives in feature components and domain services.

**Rationale:** Screens stay readable. Logic is reusable across screens.

### 8. No Emojis by Default

**Decision:** Use Ionicons for all icons. Emojis only if user explicitly requests.

**Rationale:** Consistent visual language. Emojis render differently across devices.

### 9. Reserved Orange

**Decision:** The coral/orange color (#E8836D) is reserved for the app's primary accent. Competitors cannot choose orange.

**Rationale:** Ensures the app's brand color doesn't conflict with competitor colors.

## Current Features (v1.0)

- [x] Scoreboard with weekly scores and prize (collapsible with scroll animation)
- [x] Day strip for navigating the week
- [x] Task list with competitor point circles
- [x] Add/edit tasks via bottom sheet
- [x] Recurring tasks (repeat on selected weekdays)
- [x] Swipe-to-delete with confirmation for recurring
- [x] Settings screen (competitors, week end day, prize, theme)
- [x] Theme preference (system/light/dark)
- [x] Repeat icon indicator on recurring tasks
- [x] **Firebase real-time sync** - Multi-device support
- [x] **Sign in with Apple only** - No guest mode; required before household
- [x] **Onboarding flow** - 3-step household creation
- [x] **Join flow** - Partner invitation via 6-character code
- [x] **Pending housemate** - Log tasks for invitee before they join
- [x] **Recurring tasks** - Anchor task + seed; convert one-off→recurring without duplicates
- [x] **Clear all task data** - Settings → Data (tasks, templates, skip records from Firestore)
- [x] **TestFlight deployment** - App available for beta testing

## Planned Features

### v1.1
- [ ] Stats & History screen with charts
- [ ] Push notifications for reminders

### Future
- [ ] Task suggestions/templates library
- [ ] Achievements and streaks
- [ ] Weekly summary notifications

## Development

### Setup

```bash
cd rn-app
npm install
npx expo start
```

### Running Tests

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

### Code Conventions

1. **Components:** PascalCase, one per file, export both named and default
2. **Hooks:** `use` prefix, camelCase
3. **Services:** Pure functions, camelCase
4. **Models:** Interfaces with JSDoc comments
5. **Imports:** Barrel files (`index.ts`) for clean imports

### File Organization

- Feature components go in `src/components/features/`
- Reusable UI primitives go in `src/components/ui/`
- Business logic goes in `src/domain/services/`
- Type definitions go in `src/domain/models/`
- Always add new components to their barrel file (`index.ts`)

## Key Files Reference

| What | Where |
|------|-------|
| Main screen | `app/index.tsx` |
| Settings screen | `app/settings.tsx` |
| Onboarding (create) | `app/onboarding/create.tsx` |
| Onboarding (join) | `app/onboarding/join.tsx` |
| Theme colors | `src/theme/colors.ts` |
| Typography | `src/theme/typography.ts` |
| Task data model | `src/domain/models/TaskInstance.ts` |
| Competitor model | `src/domain/models/Competitor.ts` |
| Scoring logic | `src/domain/services/scoring.ts` |
| Task seeding | `src/domain/services/seeding.ts` |
| Challenge state | `src/store/useChallengeStore.ts` |
| Firebase provider | `src/providers/FirebaseProvider.tsx` |
| Household service | `src/services/firebase/householdService.ts` |
| Add/Edit sheet | `src/components/features/AddTaskSheet.tsx` |

## Contributing

When making changes:

1. Keep components small and focused
2. Add new domain logic as pure functions in `src/domain/services/`
3. Use theme tokens, never hard-coded colors or spacing
4. Update this README if adding new patterns or making architectural decisions
5. Run tests before committing

---

*Last updated: March 2026*
