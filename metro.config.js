const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    alias: {
      ...(defaultConfig.resolver.alias || {}),
      // Removed crypto-related aliases
      stream: "stream-browserify",
      util: "util",
      events: require.resolve("events/"),
      ws: require.resolve("isomorphic-ws"),
    },
    unstable_enablePackageExports: false,
  },
};
