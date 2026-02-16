/**
 * React Native CLI autolinking configuration.
 *
 * Manually registers @amplitude/plugin-session-replay-react-native
 * because the package lacks its own react-native.config.js, which
 * prevents Expo / RN CLI autolinking from discovering the native module.
 */
module.exports = {
  dependencies: {
    '@amplitude/plugin-session-replay-react-native': {
      root: require('path').resolve(
        __dirname,
        'node_modules/@amplitude/plugin-session-replay-react-native'
      ),
    },
  },
};
