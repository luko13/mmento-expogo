// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver alias para módulos de Node.js
config.resolver.alias = {
  crypto: 'react-native-crypto',
  stream: 'stream-browserify',
  util: 'util',
  events: require.resolve('events/'),
}

// SOLUCIÓN PRINCIPAL: Desactivar el uso de "exports" de package.json
config.resolver.unstable_enablePackageExports = false

// Mantener la exclusión del módulo ws para mayor seguridad
config.resolver.blockList = /node_modules\/ws\//

// Agregar soporte para workers
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-threads': require.resolve('react-native-threads'),
};

// Asegurar que los workers se incluyan
config.serializer = {
  ...config.serializer,
  processModuleFilter: (module) => {
    if (module.path.includes('crypto.worker.thread')) {
      return true;
    }
    return true;
  },
};

module.exports = config;