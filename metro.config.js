const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver alias para módulos de Node.js
config.resolver.alias = {
  crypto: 'react-native-crypto',
  stream: 'stream-browserify',
  util: 'util',
  // Si necesitas events en el futuro
  events: require.resolve('events/'),
}

// SOLUCIÓN PRINCIPAL: Desactivar el uso de "exports" de package.json
// Esto evita que Metro intente usar módulos de Node.js
config.resolver.unstable_enablePackageExports = false

// Mantener la exclusión del módulo ws para mayor seguridad
config.resolver.blockList = /node_modules\/ws\//

module.exports = config