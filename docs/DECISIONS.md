# Architecture Decision Records

This document tracks significant architectural and design decisions made during development. Each decision includes context, rationale, and consequences.

---

## ADR-001: Local-First Data Strategy

**Date:** January 2026  
**Status:** Active

### Context
We needed to decide on a data persistence strategy for the app.

### Decision
Implement local-first with Zustand stores. Backend sync (Firebase) is planned but not blocking v1.

### Rationale
- App must work offline (common use case: logging chores without wifi)
- Instant responsiveness improves UX
- Sync complexity can be addressed later
- Local-only is simpler to build and debug

### Consequences
- (+) App feels instant
- (+) Works offline
- (+) Simpler initial implementation
- (-) Multi-device sync not available in v1
- (-) Data loss if app is uninstalled

---

## ADR-002: Zustand Over Redux/Context

**Date:** January 2026  
**Status:** Active

### Context
Needed state management solution for React Native app.

### Decision
Use Zustand for all global state management.

### Rationale
- Minimal boilerplate compared to Redux
- Better TypeScript inference than Context
- Stores are composable (household, challenge, recurring)
- Simple mental model: just functions
- Small bundle size

### Consequences
- (+) Clean, readable store files
- (+) Easy to add new stores
- (+) Great DevX with TypeScript
- (-) Less ecosystem tooling than Redux

---

## ADR-003: Domain-Driven Design

**Date:** January 2026  
**Status:** Active

### Context
Needed to organize business logic in a maintainable way.

### Decision
Separate domain logic into `src/domain/` with:
- `models/` - TypeScript interfaces with helper functions
- `services/` - Pure functions for business logic

### Rationale
- Makes logic testable without React
- Reusable across components and screens
- Clear separation of concerns
- Framework-agnostic core

### Consequences
- (+) Highly testable business logic
- (+) Clear import structure
- (+) Easy to reason about
- (-) More files to manage

---

## ADR-004: dayKey Format (yyyy-MM-dd)

**Date:** January 2026  
**Status:** Active

### Context
Needed a consistent way to reference dates throughout the app.

### Decision
Use `yyyy-MM-dd` string format (called "dayKey") for all date references.

### Rationale
- Timezone-agnostic storage (computed from household timezone)
- Sortable as strings
- Human-readable in debug
- No Date object serialization issues

### Consequences
- (+) Simple, consistent date handling
- (+) Easy to compare and sort
- (+) No timezone bugs in storage
- (-) Requires conversion for display

---

## ADR-005: Idempotent Task Seeding

**Date:** January 2026  
**Status:** Active

### Context
Recurring tasks need to create TaskInstances for each relevant day.

### Decision
Make seeding idempotent: calling `seedTasks()` multiple times is safe and won't create duplicates.

### Rationale
- Simplifies initialization (just seed on mount)
- No need to track "already seeded" state
- Robust against app restarts
- Uses lookup set for O(1) duplicate checking

### Consequences
- (+) Simple initialization logic
- (+) Robust against edge cases
- (+) Safe to call anytime
- (-) Slightly more complex seeding function

---

## ADR-006: Skip Records for Deletion

**Date:** January 2026  
**Status:** Active

### Context
When a user deletes a recurring task instance, it shouldn't reappear after re-seeding.

### Decision
Create a SkipRecord when deleting a template-based task. Seeding checks skip records before creating instances.

### Rationale
- Preserves user intent across sessions
- Clean separation from template logic
- Can be used for "skip today" feature later

### Consequences
- (+) Deleted tasks stay deleted
- (+) Clear audit trail
- (-) Additional data structure to manage

---

## ADR-007: Reserved Orange for App Accent

**Date:** January 2026  
**Status:** Active

### Context
Competitors can choose their own colors, but the app also needs a consistent brand color.

### Decision
The coral/orange color (#E8836D) is reserved for the app's primary accent. Competitors cannot choose orange variants.

### Rationale
- Ensures visual distinction between app chrome and competitor elements
- Prevents confusion (is that button mine or the app's?)
- Maintains brand consistency

### Consequences
- (+) Clear visual hierarchy
- (+) Consistent brand color
- (-) One less color choice for users

---

## ADR-008: Typography System (6 Variants)

**Date:** January 2026  
**Status:** Active (Consolidated from 9 to 6)

### Context
Initially had 9 typography variants which led to inconsistency and decision fatigue.

### Decision
Consolidate to 6 core variants following iOS HIG: title, display, headline, body, callout, caption.

### Rationale
- Fewer choices = more consistency
- Aligns with iOS conventions
- Clear use case for each variant
- Easier to maintain

### Consequences
- (+) More consistent UI
- (+) Faster design decisions
- (+) Smaller theme file

---

## ADR-009: 3-Column Scoreboard Layout

**Date:** January 2026  
**Status:** Active

### Context
The scoreboard card needed to display competitor names, scores, date range, trophy, and prize.

### Decision
Use a 3-column layout:
- Left: Competitor A name + score (vertically centered)
- Center: Date range, trophy icon, prize (stacked)
- Right: Competitor B name + score (vertically centered)

### Rationale
- Each competitor is a cohesive visual unit
- Trophy icon is the focal point
- Prize is prominently displayed under trophy
- Better vertical centering than row-based layout

### Consequences
- (+) Clear visual hierarchy
- (+) Trophy as centerpiece reinforces gamification
- (+) Compact vertical space

---

## ADR-010: Week End Day (Not Start Day)

**Date:** January 2026  
**Status:** Active

### Context
Users needed to configure when their weekly competition resets.

### Decision
Present this as "Week ends on" (e.g., Friday) rather than "Week starts on" (e.g., Saturday).

### Rationale
- More intuitive: "Our competition ends on Friday"
- Matches how households think about chore weeks
- Internally converted: weekStartDay = (endDay + 1) % 7

### Consequences
- (+) More intuitive UI
- (+) Same internal representation
- (-) Slight mismatch between UI label and internal field name

---

## ADR-011: Theme Preference via Context

**Date:** January 2026  
**Status:** Active

### Context
Users wanted to control light/dark mode independently of system settings.

### Decision
Create ThemeContext that:
1. Reads user preference from household store
2. Resolves actual color scheme (system follows device, or forced light/dark)
3. Provides resolved scheme to useTheme hook

### Rationale
- Clean separation of preference vs. resolved value
- Single source of truth for theme
- Navigation theme also respects preference

### Consequences
- (+) User control over theme
- (+) System option still available
- (+) Consistent theming throughout app

---

## Template for New Decisions

```markdown
## ADR-XXX: [Title]

**Date:** [Month Year]  
**Status:** Active | Superseded by ADR-XXX | Deprecated

### Context
[What is the issue that we're seeing that is motivating this decision?]

### Decision
[What is the change that we're proposing and/or doing?]

### Rationale
[Why is this the best choice among alternatives?]

### Consequences
[What becomes easier or more difficult because of this change?]
```
