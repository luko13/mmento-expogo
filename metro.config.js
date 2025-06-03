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
      ws: require.resolve('isomorphic-ws'),  // Agrega esta línea
    },
    unstable_enablePackageExports: false,
    extraNodeModules: {
      ...(defaultConfig.resolver.extraNodeModules || {}),
      'react-native-threads': require.resolve('react-native-threads'),
    },
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