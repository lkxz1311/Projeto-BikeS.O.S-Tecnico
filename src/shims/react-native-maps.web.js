// Stub para web: react-native-maps não suporta web.
const React = require("react");
const { View, Text } = require("react-native");

function MapView({ style, children }) {
  return React.createElement(
    View,
    { style: [{ alignItems: "center", justifyContent: "center", backgroundColor: "#eee" }, style] },
    React.createElement(Text, null, "Mapa disponível apenas no app (Android/iOS).")
  );
}
const Noop = () => null;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Noop;
module.exports.Polyline = Noop;
module.exports.Polygon = Noop;
module.exports.Circle = Noop;
module.exports.Callout = Noop;
module.exports.PROVIDER_GOOGLE = "google";
module.exports.PROVIDER_DEFAULT = null;
