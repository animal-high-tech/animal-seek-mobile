module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Enables file-based routing transforms and nicer DX with Expo Router
      'expo-router/babel',
      // Must be last
      'react-native-reanimated/plugin',
    ],
  };
};

