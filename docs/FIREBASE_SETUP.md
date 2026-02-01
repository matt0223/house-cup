# Firebase Setup Guide

This guide walks through setting up Firebase for the House Cup app.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or "Add project")
3. Name it "House Cup" (or similar)
4. Disable Google Analytics (not needed for this app)
5. Click "Create project"

## Step 2: Add iOS App

1. In your Firebase project, click the iOS icon to add an iOS app
2. Enter the bundle ID: `com.kabusworks.housecup`
3. Enter app nickname: "House Cup iOS"
4. Skip the App Store ID for now
5. Click "Register app"
6. Download `GoogleService-Info.plist`
7. Place the file at: `rn-app/GoogleService-Info.plist`

## Step 3: Add Android App

1. Click "Add app" and select Android
2. Enter the package name: `com.kabusworks.housecup`
3. Enter app nickname: "House Cup Android"
4. Skip the SHA-1 for now (can add later for production)
5. Click "Register app"
6. Download `google-services.json`
7. Place the file at: `rn-app/google-services.json`

## Step 4: Enable Firestore

1. In Firebase Console, go to "Build" → "Firestore Database"
2. Click "Create database"
3. Select "Start in test mode" (we'll add security rules later)
4. Choose a location close to your users (e.g., `us-central`)
5. Click "Enable"

## Step 5: Enable Anonymous Authentication

1. Go to "Build" → "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click "Anonymous" 
5. Toggle "Enable" and click "Save"

## Step 6: Set Up Security Rules

1. Go to "Firestore Database" → "Rules" tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Households - users can only access their own household
    match /households/{householdId} {
      allow read, write: if request.auth != null 
        && request.auth.uid in resource.data.memberIds;
      
      // Allow creating a household if authenticated
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.memberIds;
      
      // All subcollections inherit household access
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberIds;
      }
    }
  }
}
```

3. Click "Publish"

## Step 7: Build the Dev Client

After adding the config files, build the development client:

```bash
# For iOS simulator
npx expo run:ios

# For Android emulator
npx expo run:android
```

This creates a custom dev client with Firebase native modules.

## File Structure

After setup, you should have:

```
rn-app/
├── GoogleService-Info.plist  # iOS config
├── google-services.json      # Android config
├── app.json                  # Already configured with plugins
└── src/services/firebase/    # Firebase service layer
```

## Troubleshooting

### "No Firebase App" error
Make sure the config files are in the root `rn-app/` directory and rebuild the app.

### "Permission denied" errors
Check that:
1. Anonymous auth is enabled
2. The user's UID is in the household's `memberIds` array
3. Security rules are published

### App crashes on launch
Rebuild the dev client after adding/changing Firebase config:
```bash
npx expo prebuild --clean
npx expo run:ios  # or run:android
```
