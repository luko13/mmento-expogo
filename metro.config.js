const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    alias: {
      ...(defaultConfig.resolver.alias || {}),
      crypto: 'react-native-crypto',
      stream: 'stream-browserify',
      util: 'util',
      events: require.resolve('events/'),
      ws: require.resolve('isomorphic-ws'),
    },
    unstable_enablePackageExports: false,
  },
  serializer: {
    ...defaultConfig.serializer,
    processModuleFilter: (module) => {
      if (module.path.includes('crypto.worker.thread')) {
        return true;
      }
      return true;
    },
  },
};