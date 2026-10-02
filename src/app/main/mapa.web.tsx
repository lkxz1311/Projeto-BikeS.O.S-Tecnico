import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function MapaWebFallback() {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="map-outline" size={48} color="#1565C0" />
      <Text style={styles.texto}>Mapa disponível apenas no app mobile.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#F5F9FF",
  },
  texto: {
    fontSize: 14,
    color: "#5F6B7A",
    textAlign: "center",
  },
});
