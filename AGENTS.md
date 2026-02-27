# House Cup - Agent Instructions

See `CLAUDE.md` for full product context, tech stack, architecture, and coding conventions.

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Notes |
|---------|---------|-------|
| **Expo Dev Server** | `npx expo start --web --port 8081` | Metro bundler for iOS bundles. Web target shows a native module error (Amplitude Session Replay) — this is expected. iOS bundles compile successfully at `http://localhost:8081/...entry.bundle?platform=ios&dev=true`. |
| **Cloud Functions** | `cd functions && npm run build` | TypeScript compilation only. Deployment requires Firebase CLI auth. |

### Running tests

- `npm test` — Runs Jest unit tests (domain logic + store tests). One pre-existing test failure in `dayKey.test.ts` (en-dash `–` vs hyphen `-` in `formatDayKeyRange`).
- `npx tsc --noEmit` — TypeScript type checking for the main app. Pre-existing type errors exist (SharedValue imports from reanimated v4, color type narrowing, etc.). These do not block runtime.
- `cd functions && npx tsc --noEmit` — Functions type check (clean).

### Key caveats

- **iOS-first app**: The app uses native modules (Apple Sign-In, Amplitude Session Replay) that don't work on the web target. The Expo web server will show a `requireNativeComponent` error in the browser — this is normal. Verify iOS bundle compilation via the Metro bundler endpoint instead.
- **Offline mode**: Without valid Firebase env vars in `.env`, the app runs with local sample data. Copy `.env.example` to `.env` for the default (placeholder) config.
- **No `.env.local`**: Per `CLAUDE.md`, do not create `.env.local` — it takes precedence and causes config mismatches.
- **Two npm install targets**: Root (`/workspace`) for the React Native app and `/workspace/functions` for Cloud Functions. Both need `npm install`.
