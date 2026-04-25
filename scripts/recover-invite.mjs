/**
 * One-off recovery script for the Ondrej/Janelle invite bug.
 *
 * Performs two operations:
 *   1. On Ondrej's household (jgqXDqUbX7G3DftzsyQv):
 *      - Claim Janelle's pending competitor slot (set userId)
 *      - arrayUnion Janelle's UID into memberIds
 *      - Clear inviteSentAt on her competitor
 *   2. Recursively delete Janelle's empty household (84XAhvNkaKU3KpXArNIn)
 *
 * After this runs, Janelle reopens the app, taps Sign in with Apple, and
 * recoverHousehold() will find Ondrej's household via her UID in memberIds.
 *
 * Usage:
 *   node scripts/recover-invite.mjs              # dry-run (default)
 *   node scripts/recover-invite.mjs --commit     # actually writes
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const PROJECT_ID = 'house-cup-3e1d7';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ONDREJ_HOUSEHOLD_ID = 'jgqXDqUbX7G3DftzsyQv';
const JANELLE_HOUSEHOLD_ID = '84XAhvNkaKU3KpXArNIn';
const JANELLE_UID = '9rlDxpEZsoXceiIl590RZzBjSDj1';

const COMMIT = process.argv.includes('--commit');

// ---- Auth via firebase-tools refresh token ----
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
  if (!data.access_token) throw new Error('Token fetch failed: ' + JSON.stringify(data));
  return data.access_token;
}

// ---- Firestore REST helpers ----
function val(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(val);
  if (v.mapValue) {
    const out = {};
    for (const [k, vv] of Object.entries(v.mapValue.fields || {})) out[k] = val(vv);
    return out;
  }
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  return v;
}

function toFirestoreValue(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(toFirestoreValue) } };
  if (typeof x === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(x)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  throw new Error('Unsupported value type: ' + typeof x);
}

const token = await getAccessToken();

async function getDoc(path) {
  const r = await fetch(`${FIRESTORE_URL}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

async function patchDoc(path, fields, updateMask) {
  const params = updateMask.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const r = await fetch(`${FIRESTORE_URL}/${path}?${params}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// ---- Operation 1: Claim Janelle's slot in Ondrej's household ----
console.log(`\n=== ${COMMIT ? 'COMMIT MODE' : 'DRY-RUN'} ===\n`);
console.log(`Reading Ondrej's household (${ONDREJ_HOUSEHOLD_ID})...`);

const ondrejDoc = await getDoc(`households/${ONDREJ_HOUSEHOLD_ID}`);
const ondrejFields = ondrejDoc.fields || {};
const competitors = val(ondrejFields.competitors) || [];
const memberIds = val(ondrejFields.memberIds) || [];

console.log('\nBEFORE:');
console.log('  memberIds:', JSON.stringify(memberIds));
console.log('  competitors:');
for (const c of competitors) {
  console.log(`    - id=${c?.id} name=${c?.name} userId=${c?.userId ?? '(pending)'} inviteSentAt=${c?.inviteSentAt ?? ''}`);
}

// Validate state
const pendingIdx = competitors.findIndex((c) => !c?.userId);
if (pendingIdx === -1) {
  console.error('\n!! No pending competitor slot in Ondrej\'s household. Already claimed?');
  process.exit(1);
}
if (memberIds.includes(JANELLE_UID)) {
  console.error('\n!! Janelle\'s UID already in memberIds. Already recovered?');
  process.exit(1);
}
if (competitors[pendingIdx].name !== 'Janelle') {
  console.warn(`\n!! Pending competitor name is "${competitors[pendingIdx].name}", not "Janelle". Continuing anyway.`);
}

// Build new state
const newCompetitors = competitors.map((c, i) => {
  if (i !== pendingIdx) return c;
  const next = { ...c, userId: JANELLE_UID };
  delete next.inviteSentAt;
  return next;
});
const newMemberIds = [...memberIds, JANELLE_UID];

console.log('\nAFTER:');
console.log('  memberIds:', JSON.stringify(newMemberIds));
console.log('  competitors:');
for (const c of newCompetitors) {
  console.log(`    - id=${c?.id} name=${c?.name} userId=${c?.userId ?? '(pending)'} inviteSentAt=${c?.inviteSentAt ?? ''}`);
}

if (COMMIT) {
  console.log('\nWriting...');
  const fields = {
    competitors: toFirestoreValue(newCompetitors),
    memberIds: toFirestoreValue(newMemberIds),
  };
  await patchDoc(`households/${ONDREJ_HOUSEHOLD_ID}`, fields, ['competitors', 'memberIds']);
  console.log('  ✓ Ondrej\'s household updated');
} else {
  console.log('\n(dry-run; no write performed — pass --commit to apply)');
}

// ---- Operation 2: Delete Janelle's empty household ----
console.log(`\nDeleting Janelle's empty household (${JANELLE_HOUSEHOLD_ID}) recursively...`);

if (COMMIT) {
  // Use firebase CLI for recursive delete (handles all subcollections)
  const cmd = `firebase firestore:delete households/${JANELLE_HOUSEHOLD_ID} --recursive --force --project=${PROJECT_ID}`;
  console.log(`  $ ${cmd}`);
  try {
    const out = execSync(cmd, { stdio: 'pipe' }).toString();
    console.log(out.split('\n').map((l) => '    ' + l).join('\n'));
    console.log('  ✓ Janelle\'s household deleted');
  } catch (e) {
    console.error('  !! Delete failed:', e.message);
    process.exit(1);
  }
} else {
  console.log('  (dry-run; no delete performed — pass --commit to apply)');
  // Show what's there so we know what we'd be deleting
  const janelleDoc = await getDoc(`households/${JANELLE_HOUSEHOLD_ID}`).catch(() => null);
  if (!janelleDoc) {
    console.log('  Note: Janelle\'s household no longer exists. (Already deleted?)');
  } else {
    console.log('  Would delete this doc + all its subcollections (challenges, tasks, templates, skipRecords).');
  }
}

console.log(`\n=== ${COMMIT ? 'DONE' : 'DRY-RUN COMPLETE'} ===\n`);
