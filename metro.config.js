const path = require("path");
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

// react-native-maps não suporta web: usa um stub no bundle web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/shims/react-native-maps.web.js"),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
