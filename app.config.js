/**
 * Dynamic Expo configuration
 * 
 * This extends app.json with environment-specific overrides.
 * - Development builds: "House Cup Dev" with .dev bundle ID
 * - Production builds: "House Cup" with production bundle ID
 */

const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'House Cup Dev' : 'House Cup',
    slug: 'house-cup',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: IS_DEV ? 'housecup-dev' : 'housecup',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FAF8F5',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: IS_DEV
        ? 'com.kabusworks.housecup.dev'
        : 'com.kabusworks.housecup',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      buildNumber: '10',
      usesAppleSignIn: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FAF8F5',
      },
      edgeToEdgeEnabled: true,
      package: IS_DEV
        ? 'com.kabusworks.housecup.dev'
        : 'com.kabusworks.housecup',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: ['expo-router', 'expo-apple-authentication'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'a8dab4a0-5368-49ec-8b14-ff9232bee0e1',
      },
    },
  },
};
