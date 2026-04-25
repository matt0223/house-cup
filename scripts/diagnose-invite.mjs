/**
 * One-off diagnostic for the invite-acceptance bug.
 *
 * Queries prod Firestore for:
 *   1. Households where Ondrej's UID is in memberIds
 *   2. Households where Janelle's UID is in memberIds
 *   3. Currently deployed Firestore rules
 *
 * Run: node scripts/diagnose-invite.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ID = 'house-cup-3e1d7';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const RULES_URL = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`;

const JANELLE_UID = '9rlDxpEZsoXceiIl59ORZzBjSDj1';
// Ondrej's UID was truncated in screenshot; we'll find his household by listing
// all households where memberIds contains Janelle's UID first, then look for
// counterparties. We'll also list ALL households just in case.

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

const token = await getAccessToken();

// ---- 1. Fetch deployed firestore rules ----
console.log('=== DEPLOYED PROD FIRESTORE RULES ===\n');
const rulesResp = await fetch(RULES_URL, {
  headers: { Authorization: `Bearer ${token}` },
});
const rulesData = await rulesResp.json();
const rulesetName = rulesData.rulesetName;
console.log('Active ruleset:', rulesetName);
console.log('Updated:', rulesData.updateTime);

if (rulesetName) {
  const rulesetResp = await fetch(`https://firebaserules.googleapis.com/v1/${rulesetName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ruleset = await rulesetResp.json();
  const source = ruleset.source?.files?.[0]?.content;
  console.log('\n--- Rules content ---\n' + source);
}

// ---- 2. List all households in prod ----
console.log('\n\n=== HOUSEHOLDS IN PROD (top 50) ===\n');
const listResp = await fetch(`${FIRESTORE_URL}/households?pageSize=50`, {
  headers: { Authorization: `Bearer ${token}` },
});
const listData = await listResp.json();
const docs = listData.documents || [];
console.log(`Total households fetched: ${docs.length}`);

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

for (const doc of docs) {
  const id = doc.name.split('/').pop();
  const fields = doc.fields || {};
  const memberIds = val(fields.memberIds) || [];
  const competitors = val(fields.competitors) || [];
  const joinCode = val(fields.joinCode);
  const createdAt = val(fields.createdAt);
  const containsJanelle = memberIds.includes(JANELLE_UID);
  const competitorsHasJanelle = competitors.some((c) => c?.userId === JANELLE_UID);
  console.log(`\n--- household ${id} ---`);
  console.log(`  joinCode: ${joinCode}`);
  console.log(`  createdAt: ${createdAt}`);
  console.log(`  memberIds (${memberIds.length}): ${JSON.stringify(memberIds)}`);
  console.log(`  competitors:`);
  for (const c of competitors) {
    console.log(`    - id=${c?.id} name=${c?.name} color=${c?.color} userId=${c?.userId ?? '(pending)'} inviteSentAt=${c?.inviteSentAt ?? ''}`);
  }
  if (containsJanelle) console.log('  >>> JANELLE IS IN memberIds <<<');
  if (competitorsHasJanelle) console.log('  >>> JANELLE IS LINKED TO A COMPETITOR <<<');
}
