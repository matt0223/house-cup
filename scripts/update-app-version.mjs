/**
 * Update the config/appVersion document in Firestore with the current build number.
 *
 * Run after pushing a new TestFlight build to notify users of the update.
 *
 * Usage:
 *   node scripts/update-app-version.mjs                  # uses buildNumber from app.config.js
 *   node scripts/update-app-version.mjs 18               # explicit build number
 *   node scripts/update-app-version.mjs --project prod   # target production (default: dev)
 *
 * Uses the Firestore REST API with an access token from the firebase-tools
 * refresh token (same pattern as seed-history.mjs).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse args
const args = process.argv.slice(2);
const useProd = args.includes('--project') && args[args.indexOf('--project') + 1] === 'prod';
const explicitBuild = args.find((a) => /^\d+$/.test(a));

// Determine project ID
const PROJECT_ID = useProd ? 'house-cup-3e1d7' : 'house-cup-dev';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get build number from app.config.js or CLI arg
function getBuildNumber() {
  if (explicitBuild) return explicitBuild;

  const configPath = join(__dirname, '..', 'app.config.js');
  const configContent = readFileSync(configPath, 'utf-8');
  const match = configContent.match(/buildNumber:\s*['"](\d+)['"]/);
  if (!match) {
    console.error('Could not parse buildNumber from app.config.js');
    process.exit(1);
  }
  return match[1];
}

// Get access token via firebase-tools refresh token
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
    console.error('Failed to get access token:', data);
    process.exit(1);
  }
  return data.access_token;
}

async function updateAppVersion(buildNumber, token) {
  const docPath = `${BASE_URL}/config/appVersion`;
  const now = new Date().toISOString();

  const body = {
    fields: {
      latestBuildNumber: { stringValue: buildNumber },
      updatedAt: { timestampValue: now },
    },
  };

  const resp = await fetch(docPath, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const error = await resp.text();
    console.error(`Failed to update config/appVersion: ${resp.status}`, error);
    process.exit(1);
  }

  const result = await resp.json();
  console.log(`Updated config/appVersion on ${PROJECT_ID}:`);
  console.log(`  latestBuildNumber: ${buildNumber}`);
  console.log(`  updatedAt: ${now}`);
  return result;
}

// Main
const buildNumber = getBuildNumber();
console.log(`Build number: ${buildNumber}`);
console.log(`Project: ${PROJECT_ID}`);
console.log('');

const token = await getAccessToken();
await updateAppVersion(buildNumber, token);
console.log('\nDone.');
