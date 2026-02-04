# Firebase Setup Guide

This guide walks you through setting up Firebase for the House Cup app.

## Overview

House Cup uses the **Firebase JS SDK** (web SDK) which works with Expo Go and doesn't require native builds. This makes development faster and easier.

**Important:** The app uses **two separate Firebase projects**:
- `house-cup-dev` - Development/testing (bundle ID: `com.kabusworks.housecup.dev`)
- `house-cup-3e1d7` - Production/TestFlight (bundle ID: `com.kabusworks.housecup`)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter a project name (e.g., "House Cup")
4. Disable Google Analytics (optional for this app)
5. Click **Create Project**

## Step 2: Add a Web App

1. In the Firebase Console, click the gear icon → **Project settings**
2. Scroll down to "Your apps" section
3. Click the **Web** icon (</>) to add a web app
4. Enter an app nickname (e.g., "House Cup Web")
5. Don't check "Firebase Hosting"
6. Click **Register app**
7. **Copy the firebaseConfig object** - you'll need these values

The config looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the values from your Firebase config:
   ```env
   APP_VARIANT=development
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:abc123
   ```

**Important:** Don't create `.env.local` - it loads first and can override your settings.

For EAS builds, environment variables are also set in `eas.json` per build profile.

## Step 4: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get started**
3. In the "Sign-in method" tab, enable **Anonymous**
4. Click **Save**

### Enable Sign in with Apple

For account recovery, users can link their Apple ID:

1. In Firebase Console → Authentication → Sign-in method, click **Add new provider**
2. Select **Apple** and enable it
3. Fill in the OAuth configuration:
   - **Services ID**: Your Services ID from Apple Developer Portal (e.g., `com.kabusworks.housecup.dev.signin`)
   - **Apple Team ID**: Your 10-character Team ID
   - **Key ID**: From your Sign in with Apple private key
   - **Private Key**: Contents of your `.p8` file

### Apple Developer Portal Setup (Required for Sign in with Apple)

1. **Create a Services ID**:
   - Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId)
   - Create a new Services ID (e.g., `com.kabusworks.housecup.dev.signin`)
   - Enable "Sign In with Apple" and configure:
     - Primary App ID: Your app's App ID
     - Domain: `your-project.firebaseapp.com`
     - Return URL: `https://your-project.firebaseapp.com/__/auth/handler`

2. **Create a Private Key**:
   - Go to [Keys](https://developer.apple.com/account/resources/authkeys/list)
   - Create a key with "Sign In with Apple" enabled
   - Download the `.p8` file (only available once!)
   - Note the Key ID

## Step 5: Create Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a region close to your users
5. Click **Enable**

## Step 6: Set Up Security Rules

For development, the test mode rules work fine. For production, use these rules:

1. Go to **Firestore Database** → **Rules** tab
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Households collection
    match /households/{householdId} {
      // Allow read/write if user is a member
      allow read, write: if request.auth != null 
        && request.auth.uid in resource.data.memberIds;
      
      // Allow creation if user will be a member
      allow create: if request.auth != null 
        && request.auth.uid in request.resource.data.memberIds;
      
      // Subcollections inherit parent access
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null 
          && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberIds;
      }
    }
  }
}
```

3. Click **Publish**

## Step 7: Run the App

```bash
npx expo start
```

The app will work in **offline mode** (local data only) if Firebase isn't configured. Once you add your `.env.local` file with Firebase credentials, sync will be enabled automatically.

## Troubleshooting

### "Firebase is not configured"
- Make sure `.env.local` exists and has all required variables
- Restart the Expo development server after adding `.env.local`

### "Permission denied" errors
- Check that Anonymous Auth is enabled
- Check that Firestore security rules allow access

### Data not syncing
- Check the console for error messages
- Verify your Firebase project is set up correctly
- Make sure you're using a valid project ID

## Data Structure

The app uses this Firestore structure:

```
households/
  {householdId}/
    - competitors: [Competitor, Competitor]
    - timezone: string
    - weekStartDay: number
    - prize: string
    - memberIds: string[]
    - joinCode: string
    - createdAt: timestamp
    
    challenges/
      {challengeId}/
        - householdId: string
        - startDayKey: string
        - endDayKey: string
        - prize: string
        - isCompleted: boolean
        - createdAt: timestamp
    
    tasks/
      {taskId}/
        - challengeId: string
        - dayKey: string
        - name: string
        - templateId: string | null
        - points: { [competitorId]: number }
        - createdAt: timestamp
        - updatedAt: timestamp
    
    templates/
      {templateId}/
        - householdId: string
        - name: string
        - repeatDays: number[]
        - createdAt: timestamp
        - updatedAt: timestamp
    
    skipRecords/
      {templateId:dayKey}/
        - templateId: string
        - dayKey: string
```

## Switching to Native SDK (Future)

When Firebase updates their native SDK for iOS 26 compatibility, you can switch to the native SDK for better performance:

1. Install native packages:
   ```bash
   npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore expo-dev-client
   ```

2. Add config files (GoogleService-Info.plist, google-services.json)

3. Update service files to use native SDK imports

4. Build with `npx expo run:ios`
