/**
 * House Cup Cloud Functions
 *
 * 1. completeExpiredChallenges — Scheduled (hourly). Finds challenges past their
 *    endDayKey, calculates scores, marks them complete, and creates the next week.
 *
 * 2. onChallengeCompleted — Firestore trigger. When a challenge's isCompleted
 *    flips to true, generates an LLM-powered narrative via OpenAI and writes it
 *    back to the challenge document.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// OpenAI API key stored as a Firebase secret
const openaiKey = defineSecret("OPENAI_API_KEY");

// ---------------------------------------------------------------------------
// Types (mirrored from client domain models — kept minimal for Cloud Functions)
// ---------------------------------------------------------------------------

interface Competitor {
  id: string;
  name: string;
  color: string;
  userId?: string;
}

interface TaskPoints {
  [competitorId: string]: number;
}

interface TaskInstance {
  id: string;
  challengeId: string;
  dayKey: string;
  name: string;
  points: TaskPoints;
}

interface ChallengeDoc {
  householdId: string;
  startDayKey: string;
  endDayKey: string;
  prize: string;
  winnerId: string | null;
  isTie: boolean;
  isCompleted: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  narrative?: {
    headline: string;
    body: string;
    insightTip?: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get today's date as a dayKey (yyyy-MM-dd) in a given timezone. */
function getTodayDayKey(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/** Add days to a dayKey string. */
function addDays(dayKey: string, days: number): string {
  const d = new Date(dayKey + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/** Calculate total points for a competitor across tasks. */
function calculateCompetitorTotal(
  tasks: TaskInstance[],
  competitorId: string
): number {
  return tasks.reduce((sum, t) => sum + (t.points[competitorId] ?? 0), 0);
}

/** Calculate winner and tie status. */
function calculateScores(
  tasks: TaskInstance[],
  competitors: Competitor[]
): { winnerId: string | null; isTie: boolean } {
  if (competitors.length < 2) {
    return { winnerId: competitors[0]?.id ?? null, isTie: false };
  }

  const scoreA = calculateCompetitorTotal(tasks, competitors[0].id);
  const scoreB = calculateCompetitorTotal(tasks, competitors[1].id);

  if (scoreA === scoreB) return { winnerId: null, isTie: true };
  return {
    winnerId: scoreA > scoreB ? competitors[0].id : competitors[1].id,
    isTie: false,
  };
}

/** Calculate the start dayKey of the week containing `today`, given weekStartDay. */
function getWeekStartDayKey(today: string, weekStartDay: number): string {
  const d = new Date(today + "T12:00:00Z");
  const currentDay = d.getUTCDay();
  let diff = currentDay - weekStartDay;
  if (diff < 0) diff += 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().split("T")[0];
}

/** Fetch all tasks for a challenge. */
async function fetchTasksForChallenge(
  householdId: string,
  challengeId: string
): Promise<TaskInstance[]> {
  const snap = await db
    .collection("households")
    .doc(householdId)
    .collection("tasks")
    .where("challengeId", "==", challengeId)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      challengeId: data.challengeId,
      dayKey: data.dayKey,
      name: data.name,
      points: data.points ?? {},
    };
  });
}

// ---------------------------------------------------------------------------
// 1. Scheduled Function: Complete expired challenges
// ---------------------------------------------------------------------------

export const completeExpiredChallenges = onSchedule(
  {
    schedule: "every 1 hours",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async () => {
    console.log("Running completeExpiredChallenges...");

    // Get all households
    const householdsSnap = await db.collection("households").get();

    for (const householdDoc of householdsSnap.docs) {
      const householdId = householdDoc.id;
      const householdData = householdDoc.data();
      const timezone = householdData.timezone ?? "America/New_York";
      const weekStartDay = householdData.weekStartDay ?? 0;
      const competitors: Competitor[] = householdData.competitors ?? [];
      const prize = householdData.prize ?? "Winner picks!";

      const today = getTodayDayKey(timezone);

      // Find incomplete challenges that have ended
      const challengesSnap = await db
        .collection("households")
        .doc(householdId)
        .collection("challenges")
        .where("isCompleted", "==", false)
        .get();

      for (const challengeDoc of challengesSnap.docs) {
        const challenge = challengeDoc.data() as ChallengeDoc;

        // Only complete if endDayKey is strictly before today
        if (challenge.endDayKey >= today) continue;

        console.log(
          `Completing challenge ${challengeDoc.id} for household ${householdId} (ended ${challenge.endDayKey})`
        );

        // Fetch tasks and calculate scores
        const tasks = await fetchTasksForChallenge(
          householdId,
          challengeDoc.id
        );
        const { winnerId, isTie } = calculateScores(tasks, competitors);

        // Mark challenge as complete
        await challengeDoc.ref.update({
          isCompleted: true,
          winnerId,
          isTie,
        });

        console.log(
          `  Winner: ${winnerId ?? "tie"}, Tasks: ${tasks.length}`
        );

        // Create next week's challenge
        const nextWeekStart = getWeekStartDayKey(today, weekStartDay);
        const nextWeekEnd = addDays(nextWeekStart, 6);

        // Check if a challenge already exists for this week
        const existingSnap = await db
          .collection("households")
          .doc(householdId)
          .collection("challenges")
          .where("startDayKey", "==", nextWeekStart)
          .limit(1)
          .get();

        if (existingSnap.empty) {
          await db
            .collection("households")
            .doc(householdId)
            .collection("challenges")
            .add({
              householdId,
              startDayKey: nextWeekStart,
              endDayKey: nextWeekEnd,
              prize,
              winnerId: null,
              isTie: false,
              isCompleted: false,
              createdAt: FieldValue.serverTimestamp(),
            });

          console.log(
            `  Created next challenge: ${nextWeekStart} to ${nextWeekEnd}`
          );
        }
      }
    }

    console.log("completeExpiredChallenges done.");
  }
);

// ---------------------------------------------------------------------------
// 2. Firestore Trigger: Generate LLM narrative on challenge completion
// ---------------------------------------------------------------------------

export const onChallengeCompleted = onDocumentUpdated(
  {
    document: "households/{householdId}/challenges/{challengeId}",
    secrets: [openaiKey],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data() as ChallengeDoc | undefined;
    const after = event.data?.after.data() as ChallengeDoc | undefined;

    if (!before || !after) return;

    // Only trigger when isCompleted changes from false to true
    if (before.isCompleted || !after.isCompleted) return;

    // Skip if narrative already exists (idempotency guard)
    if (after.narrative) return;

    const householdId = event.params.householdId;
    const challengeId = event.params.challengeId;

    console.log(
      `Generating narrative for challenge ${challengeId} in household ${householdId}`
    );

    try {
      // Fetch household for competitor names
      const householdSnap = await db
        .collection("households")
        .doc(householdId)
        .get();
      const householdData = householdSnap.data();
      if (!householdData) {
        console.error("Household not found:", householdId);
        return;
      }

      const competitors: Competitor[] = householdData.competitors ?? [];

      // Fetch tasks for this challenge
      const tasks = await fetchTasksForChallenge(householdId, challengeId);

      // Fetch previous completed challenges for historical context (up to 5)
      const previousSnap = await db
        .collection("households")
        .doc(householdId)
        .collection("challenges")
        .where("isCompleted", "==", true)
        .orderBy("endDayKey", "desc")
        .limit(6) // 6 because one is the current
        .get();

      const previousChallenges = previousSnap.docs
        .filter((d) => d.id !== challengeId)
        .slice(0, 5);

      // Fetch tasks for previous challenges (for context, frequency baselines, and prior tips)
      const previousData: Array<{
        startDayKey: string;
        endDayKey: string;
        winnerId: string | null;
        isTie: boolean;
        totalTasks: number;
        scores: Record<string, number>;
      }> = [];
      const previousWeekFreqs: Array<Record<string, number>> = [];
      const previousInsightTips: string[] = [];

      for (const prevDoc of previousChallenges) {
        const prevChallenge = prevDoc.data() as ChallengeDoc;
        const prevTasks = await fetchTasksForChallenge(
          householdId,
          prevDoc.id
        );

        const scores: Record<string, number> = {};
        for (const comp of competitors) {
          scores[comp.name] = calculateCompetitorTotal(prevTasks, comp.id);
        }

        previousData.push({
          startDayKey: prevChallenge.startDayKey,
          endDayKey: prevChallenge.endDayKey,
          winnerId: prevChallenge.winnerId,
          isTie: prevChallenge.isTie,
          totalTasks: prevTasks.length,
          scores,
        });

        // Compute task frequency for this previous week (for baseline comparison)
        const prevFreq: Record<string, number> = {};
        for (const task of prevTasks) {
          const name = task.name.toLowerCase().trim();
          prevFreq[name] = (prevFreq[name] ?? 0) + 1;
        }
        previousWeekFreqs.push(prevFreq);

        // Collect previous insight tips (to avoid repetition)
        if (prevChallenge.narrative?.insightTip) {
          previousInsightTips.push(prevChallenge.narrative.insightTip);
        }
      }

      // Build current week's data for the prompt
      const currentScores: Record<string, number> = {};
      for (const comp of competitors) {
        currentScores[comp.name] = calculateCompetitorTotal(tasks, comp.id);
      }

      // Build daily breakdown
      const dailyBreakdown: Record<
        string,
        { tasks: string[]; scores: Record<string, number> }
      > = {};
      for (const task of tasks) {
        if (!dailyBreakdown[task.dayKey]) {
          dailyBreakdown[task.dayKey] = { tasks: [], scores: {} };
        }
        dailyBreakdown[task.dayKey].tasks.push(task.name);
        for (const comp of competitors) {
          const pts = task.points[comp.id] ?? 0;
          dailyBreakdown[task.dayKey].scores[comp.name] =
            (dailyBreakdown[task.dayKey].scores[comp.name] ?? 0) + pts;
        }
      }

      // Task frequency analysis — raw counts
      const taskFreq: Record<string, number> = {};
      for (const task of tasks) {
        const name = task.name.toLowerCase().trim();
        taskFreq[name] = (taskFreq[name] ?? 0) + 1;
      }

      // Filter to only NEW or SPIKING tasks (skip stable baseline tasks)
      const notableTasks: Record<
        string,
        { count: number; context: string }
      > = {};
      for (const [name, count] of Object.entries(taskFreq)) {
        if (count < 3) continue; // minimum threshold

        // How often did this task appear in previous weeks?
        const prevCounts = previousWeekFreqs
          .map((freq) => freq[name] ?? 0)
          .filter((c) => c > 0);

        if (prevCounts.length === 0) {
          // Never seen before → new
          notableTasks[name] = { count, context: "new this week" };
        } else if (prevCounts.length === 1) {
          // Only appeared once before → still relatively new
          notableTasks[name] = {
            count,
            context: "only appeared in 1 prior week",
          };
        } else {
          // Appeared regularly → only flag if significantly spiking (50%+)
          const avg =
            prevCounts.reduce((a, b) => a + b, 0) / prevCounts.length;
          if (count > avg * 1.5) {
            notableTasks[name] = {
              count,
              context: `up from avg ${Math.round(avg)}/week`,
            };
          }
          // Otherwise: baseline task → skip entirely
        }
      }

      // Winner name
      const winner = after.winnerId
        ? competitors.find((c) => c.id === after.winnerId)
        : null;

      // Build the prompt
      const prompt = buildPrompt({
        startDayKey: after.startDayKey,
        endDayKey: after.endDayKey,
        prize: after.prize,
        winnerId: after.winnerId,
        winnerName: winner?.name ?? null,
        isTie: after.isTie,
        competitors: competitors.map((c) => c.name),
        currentScores,
        totalTasks: tasks.length,
        dailyBreakdown,
        notableTasks,
        previousInsightTips,
        previousWeeks: previousData.map((p) => ({
          dates: `${p.startDayKey} to ${p.endDayKey}`,
          scores: p.scores,
          totalTasks: p.totalTasks,
          winnerId: p.winnerId,
          isTie: p.isTie,
        })),
      });

      // Call OpenAI
      const client = new OpenAI({ apiKey: openaiKey.value() });

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 150,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error("No response from OpenAI");
        return;
      }

      // Parse the response
      const parsed = JSON.parse(content) as {
        headline: string;
        body: string;
        insightTip?: string;
      };

      // Validate required fields
      if (!parsed.headline || !parsed.body) {
        console.error("Invalid narrative response:", content);
        return;
      }

      // Write the narrative to the challenge document
      await event.data!.after.ref.update({
        narrative: {
          headline: parsed.headline,
          body: parsed.body,
          ...(parsed.insightTip ? { insightTip: parsed.insightTip } : {}),
        },
      });

      console.log(
        `Narrative written for challenge ${challengeId}: "${parsed.headline}"`
      );
    } catch (error) {
      console.error("Failed to generate narrative:", error);
      // Don't throw — we don't want retries for OpenAI failures.
      // The client will fall back to rule-based narratives.
    }
  }
);

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the narrator for House Cup, a household chore-tracking app where two housemates compete weekly by logging tasks and earning points. The winner gets a fun prize.

Your voice: deadpan sports commentator covering a low-stakes league with full seriousness. Dry, knowing, slightly amused. You observe — you don't praise, lecture, or cheerleader. Think ESPN recap energy applied to dishes and laundry.

Your job: find the ONE thing that defined this week. Not a summary. Not who won. The non-obvious pattern, the turning point, the strategy. Things the score alone doesn't show:
- Did someone front-load Monday then coast?
- Did someone do nothing until Thursday then sweep?
- Was one day responsible for the entire margin?
- Did one person do ALL of one type of task?
- Was it over by Tuesday, or decided on the last day?

Rules:
- ONE sentence. Max 20 words. Period.
- Be specific — name days, tasks, or score swings
- Never repeat what the score already shows (who won, final numbers)
- Never use: impressive, amazing, incredible, showcased, prowess, great, fantastic, wonderful, both contributed
- Never praise. Just observe with a dry wink.
- Don't be mean or sarcastic. Be amused.

Examples of good output:
- "Pri did nothing until Thursday. Then: 14 points in three days."
- "Matt's entire lead came from doing dishes. Five times."
- "This one was over by Tuesday and everyone knew it."
- "One more load of laundry and it would've been a tie."

Return a JSON object:
- "headline": 2-5 words. The angle. Examples: "Over by Tuesday", "The Thursday surge", "Death by dishes"
- "body": 1 sentence, max 20 words. The insight. Dry, specific, slightly amused.
- "insightTip": (optional) DEFAULT IS TO OMIT. Most weeks should have NO tip. Only include one if ALL of these are true:
  1. The "Notable Task Changes" section lists a task that is NEW or SPIKING. If that section is empty, there is NO tip. Period.
  2. Your suggestion would DIRECTLY cause the named task to happen fewer times next week. If you can't explain the causal link in one obvious step, omit.
  3. The tip has NOT been given before (check "Previously Given Insight Tips" if present).
  4. The task is NOT a daily essential (cooking, dinner, dishes, feeding kids/pets, making beds, etc.). These happen every day — that's normal life, not a problem to solve.
  No tip is always better than a mediocre, obvious, or repeated tip. When in doubt, omit.`;

interface PromptData {
  startDayKey: string;
  endDayKey: string;
  prize: string;
  winnerId: string | null;
  winnerName: string | null;
  isTie: boolean;
  competitors: string[];
  currentScores: Record<string, number>;
  totalTasks: number;
  dailyBreakdown: Record<
    string,
    { tasks: string[]; scores: Record<string, number> }
  >;
  notableTasks: Record<string, { count: number; context: string }>;
  previousInsightTips: string[];
  previousWeeks: Array<{
    dates: string;
    scores: Record<string, number>;
    totalTasks: number;
    winnerId: string | null;
    isTie: boolean;
  }>;
}

function buildPrompt(data: PromptData): string {
  const lines: string[] = [];

  lines.push(`## This Week: ${data.startDayKey} to ${data.endDayKey}`);
  lines.push(`Prize: ${data.prize}`);
  lines.push(
    data.isTie
      ? `Result: Tie`
      : `Result: ${data.winnerName ?? "Unknown"} won`
  );
  lines.push(`Total tasks completed: ${data.totalTasks}`);
  lines.push("");

  // Scores
  lines.push("### Final Scores");
  for (const [name, score] of Object.entries(data.currentScores)) {
    lines.push(`- ${name}: ${score} points`);
  }
  lines.push("");

  // Daily breakdown
  lines.push("### Day-by-Day");
  const sortedDays = Object.keys(data.dailyBreakdown).sort();
  for (const day of sortedDays) {
    const d = data.dailyBreakdown[day];
    const scoreStr = Object.entries(d.scores)
      .map(([n, s]) => `${n}: ${s}`)
      .join(", ");
    lines.push(`${day}: ${d.tasks.join(", ")} (${scoreStr})`);
  }
  lines.push("");

  // Notable task changes (only new or spiking — stable baseline tasks are omitted)
  const notable = Object.entries(data.notableTasks)
    .sort(([, a], [, b]) => b.count - a.count);

  if (notable.length > 0) {
    lines.push("### Notable Task Changes This Week");
    lines.push(
      "(Only tasks that are NEW or significantly increased vs. prior weeks." +
        " Stable recurring tasks like daily dinner, dishes, etc. are omitted — they are baseline.)"
    );
    for (const [name, info] of notable) {
      lines.push(`- "${name}" appeared ${info.count} times (${info.context})`);
    }
    lines.push("");
  } else {
    lines.push("### Notable Task Changes This Week");
    lines.push("None — all tasks this week are consistent with prior weeks.");
    lines.push("");
  }

  // Previously given insight tips (to avoid repetition)
  if (data.previousInsightTips.length > 0) {
    lines.push("### Previously Given Insight Tips (DO NOT repeat these)");
    for (const tip of data.previousInsightTips) {
      lines.push(`- "${tip}"`);
    }
    lines.push("");
  }

  // Historical context
  if (data.previousWeeks.length > 0) {
    lines.push("### Previous Weeks (for context)");
    for (const week of data.previousWeeks) {
      const scoreStr = Object.entries(week.scores)
        .map(([n, s]) => `${n}: ${s}`)
        .join(", ");
      const result = week.isTie ? "Tie" : `Winner: ${week.winnerId ?? "?"}`;
      lines.push(
        `${week.dates}: ${week.totalTasks} tasks, ${scoreStr} (${result})`
      );
    }
  }

  return lines.join("\n");
}
