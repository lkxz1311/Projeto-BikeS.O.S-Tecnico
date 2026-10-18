const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ignora pastas temporárias do CMake/C++ no watcher
config.resolver.blockList = [
  /.*\/\.cxx\/.*/,
  /.*\/CMakeTmp\/.*/,
  /.*\/android\/app\/\.cxx\/.*/,
  /.*\/node_modules\/react-native-reanimated\/android\/\.cxx\/.*/,
  /.*\/node_modules\/react-native-worklets\/android\/\.cxx\/.*/,
  /.*\/node_modules\/react-native-screens\/android\/\.cxx\/.*/,
];

module.exports = config;