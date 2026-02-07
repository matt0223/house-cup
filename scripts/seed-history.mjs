/**
 * Seed script: creates 3 weeks of completed challenge history in Firestore.
 *
 * Usage:  node scripts/seed-history.mjs
 *
 * Uses the Firestore REST API with an access token obtained from the
 * firebase-tools refresh token.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ID = 'house-cup-dev';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ---- Get access token via firebase-tools refresh token ----
const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const refreshToken = config.tokens.refresh_token;

async function getAccessToken() {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

// ---- Firestore REST helpers ----
let ACCESS_TOKEN = '';

async function firestoreGet(path) {
  const resp = await fetch(`${BASE_URL}/${path}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!resp.ok) throw new Error(`GET ${path}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function firestoreList(collectionPath, pageSize = 100) {
  const resp = await fetch(`${BASE_URL}/${collectionPath}?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  if (!resp.ok) throw new Error(`LIST ${collectionPath}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function firestoreCreate(collectionPath, fields) {
  const resp = await fetch(`${BASE_URL}/${collectionPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) throw new Error(`POST ${collectionPath}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

// Firestore REST API value encoding
function stringVal(s) { return { stringValue: s }; }
function boolVal(b) { return { booleanValue: b }; }
function nullVal() { return { nullValue: null }; }
function intVal(n) { return { integerValue: String(n) }; }
function timestampVal() { return { timestampValue: new Date().toISOString() }; }
function mapVal(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = intVal(v);
  }
  return { mapValue: { fields } };
}

// ---- Helpers ----
const TASK_POOL = [
  'Dishes', 'Laundry', 'Vacuum living room', 'Take out trash',
  'Wipe counters', 'Meal prep', 'Grocery run', 'Clean bathroom',
  'Mop floors', 'Make lunches', 'Water plants', 'Fold laundry',
  'Organize pantry', 'Scrub stovetop', 'Walk the dog',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function toDayKey(date) {
  return date.toISOString().split('T')[0];
}

function addDaysToKey(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return toDayKey(d);
}

// Extract field value from Firestore REST response
function extractField(doc, field) {
  const f = doc.fields?.[field];
  if (!f) return undefined;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.integerValue !== undefined) return parseInt(f.integerValue);
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.arrayValue) return f.arrayValue.values?.map(v => {
    if (v.mapValue) {
      const obj = {};
      for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
        if (val.stringValue !== undefined) obj[k] = val.stringValue;
        else if (val.integerValue !== undefined) obj[k] = parseInt(val.integerValue);
        else if (val.booleanValue !== undefined) obj[k] = val.booleanValue;
      }
      return obj;
    }
    return v.stringValue;
  }) || [];
  return undefined;
}

async function main() {
  console.log('Getting access token...');
  ACCESS_TOKEN = await getAccessToken();
  console.log('Authenticated.');

  // Find the household
  console.log('Looking up household...');
  const householdsResp = await firestoreList('households', 1);
  const docs = householdsResp.documents || [];

  if (docs.length === 0) {
    console.error('No households found!');
    process.exit(1);
  }

  const householdDoc = docs[0];
  // Extract ID from document name: projects/.../households/{id}
  const householdId = householdDoc.name.split('/').pop();
  const competitors = extractField(householdDoc, 'competitors') || [];
  const weekStartDay = extractField(householdDoc, 'weekStartDay') ?? 0;

  console.log(`Household: ${householdId}`);
  console.log(`Competitors: ${competitors.map(c => `${c.name} (${c.id})`).join(', ')}`);
  console.log(`Week start day: ${weekStartDay}`);

  if (competitors.length < 2) {
    console.error('Need at least 2 competitors');
    process.exit(1);
  }

  const compA = competitors[0];
  const compB = competitors[1];

  // Calculate current week start
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));

  let currentWeekStart = new Date(today);
  while (currentWeekStart.getUTCDay() !== weekStartDay) {
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 1);
  }

  // Generate 3 past weeks
  const weeks = [];
  for (let w = 3; w >= 1; w--) {
    const startDate = new Date(currentWeekStart);
    startDate.setUTCDate(startDate.getUTCDate() - (w * 7));
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    weeks.push({
      startDayKey: toDayKey(startDate),
      endDayKey: toDayKey(endDate),
    });
  }

  console.log('\nWeeks to seed:');
  weeks.forEach((w, i) => console.log(`  Week ${i + 1}: ${w.startDayKey} to ${w.endDayKey}`));

  const prizes = ['Pizza night', 'Movie pick', 'Sleep in Saturday'];

  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    const prize = prizes[wi];

    console.log(`\nSeeding week ${wi + 1}: ${week.startDayKey} to ${week.endDayKey} (prize: ${prize})...`);

    const allTasks = [];
    let currentDay = week.startDayKey;
    while (currentDay <= week.endDayKey) {
      const numTasks = randomInt(1, 3);
      const taskNames = pickRandom(TASK_POOL, numTasks);

      for (let ti = 0; ti < taskNames.length; ti++) {
        const points = {};
        if (ti % 2 === 0) {
          points[compA.id] = randomInt(1, 3);
          points[compB.id] = randomInt(0, 2);
        } else {
          points[compA.id] = randomInt(0, 2);
          points[compB.id] = randomInt(1, 3);
        }

        allTasks.push({
          dayKey: currentDay,
          name: taskNames[ti],
          templateId: null,
          points,
        });
      }

      currentDay = addDaysToKey(currentDay, 1);
    }

    // Calculate scores
    let totalA = 0;
    let totalB = 0;
    for (const task of allTasks) {
      totalA += task.points[compA.id] || 0;
      totalB += task.points[compB.id] || 0;
    }

    const isTie = totalA === totalB;
    const winnerId = isTie ? null : (totalA > totalB ? compA.id : compB.id);

    console.log(`  Tasks: ${allTasks.length}, Score: ${compA.name} ${totalA} - ${compB.name} ${totalB}`);
    console.log(`  Winner: ${isTie ? 'Tie' : competitors.find(c => c.id === winnerId)?.name}`);

    // Create challenge
    const challengeFields = {
      householdId: stringVal(householdId),
      startDayKey: stringVal(week.startDayKey),
      endDayKey: stringVal(week.endDayKey),
      prize: stringVal(prize),
      winnerId: winnerId ? stringVal(winnerId) : nullVal(),
      isTie: boolVal(isTie),
      isCompleted: boolVal(true),
      createdAt: timestampVal(),
    };

    const challengeDoc = await firestoreCreate(
      `households/${householdId}/challenges`,
      challengeFields,
    );
    const challengeId = challengeDoc.name.split('/').pop();
    console.log(`  Challenge created: ${challengeId}`);

    // Create tasks (one at a time since REST API doesn't have batch)
    for (const task of allTasks) {
      const taskFields = {
        challengeId: stringVal(challengeId),
        dayKey: stringVal(task.dayKey),
        name: stringVal(task.name),
        templateId: nullVal(),
        points: mapVal(task.points),
        createdAt: timestampVal(),
        updatedAt: timestampVal(),
      };

      await firestoreCreate(
        `households/${householdId}/tasks`,
        taskFields,
      );
    }
    console.log(`  ${allTasks.length} tasks created`);
  }

  console.log('\nDone! 3 weeks of history seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
