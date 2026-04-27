# TestFlight "What to Test" Notes

Reusable copy for the **What to Test** field when uploading a build to App Store Connect → TestFlight. Generic to the product, not specific to any one build — paste as-is, or trim/extend the bullets if a particular build deserves a callout.

For build-specific changes (e.g., "we just rewrote onboarding, focus there"), prepend a short build-specific note on top, then keep the generic block underneath.

---

## Generic block (paste this)

```
House Cup is a friendly chore competition between you and a housemate — add tasks, score yourselves 1–3 points based on effort, and whoever has the most at week's end wins the prize you set together.

What to try:

• Sign in with Apple, then either start a new household or paste a housemate's invite code.
• Invite your housemate from the scoreboard (or join via code if you've been invited).
• Add a few tasks — try both a one-off ("buy groceries") and a recurring one ("dishes" on certain days).
• Tap the score circles on a task to cycle points (0 → 1 → 2 → 3 → 0). Watch the scoreboard react.
• Set a prize by tapping the trophy in the center of the scoreboard.
• Try the small stuff: swipe a task to delete, drag the grip handle to reorder, switch days using the strip at the top.
• Open Settings to change the week-end day, theme, or your name/color.

Especially helpful feedback:

• Anything confusing in the sign-in, invite, or join-by-code flow
• Bugs, glitches, or moments where the UI felt slow or unresponsive
• Things you wished worked differently
```

---

## Tips for build-specific prepends

- Lead with one sentence on what's new and why testers should care.
- If a specific area was just reworked (onboarding, scoring, history), call out *exactly* the screens and ask testers to push on edge cases there.
- Mention any known issues so testers don't waste time reporting them ("known: history narratives may take a few seconds to generate on first open").
- Keep the prepend under ~80 words; the generic block below carries the bulk.
