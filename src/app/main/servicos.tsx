import { useState, useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Chip, Text, Divider, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Pedido = {
  id: string;
  codigo: string;
  tipo: string;
  telefone: string;
  problema: string;
  bike: string;
  localizacao: string;
  pagamento: string;
  status: string;
  createdAt: string;
  user: {
    nome: string;
    telefone: string;
  };
};

export default function Servicos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      carregarPedidos();
    }, [])
  );

  async function carregarPedidos() {
    try {
      const tecnicoId = await AsyncStorage.getItem("userId");
      if (!tecnicoId) return;

      // Busca os pedidos específicos aceitos/em atendimento por este técnico
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/tecnico/${tecnicoId}`);
      const data = await response.json();
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Erro ao carregar serviços:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Meus Serviços</Text>
        <Text style={styles.subtitulo}>Acompanhe aqui os serviços em atendimento.</Text>

        {loading ? (
          <ActivityIndicator color="#2E7D32" style={{ marginTop: 30 }} />
        ) : pedidos.length === 0 ? (
          <Card style={styles.cardVazio}>
            <Card.Content style={styles.cardVazioContent}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Nenhum serviço em andamento</Text>
              <Text style={styles.cardVazioSubtexto}>Aceite pedidos na tela inicial para ver aqui</Text>
            </Card.Content>
          </Card>
        ) : (
          pedidos.map((pedido) => (
            <Card key={pedido.id} style={styles.card}>
              <Card.Content>
                <View style={styles.topo}>
                  <View>
                    <Text style={styles.codigo}>#{pedido.codigo}</Text>
                    <Text style={styles.data}>{formatarData(pedido.createdAt)}</Text>
                  </View>
                  
                  <Chip style={styles.chipStatus} textStyle={styles.chipTexto}>
                    {pedido.status}
                  </Chip>
                </View>

                <Divider style={styles.divider} />

                {/* Informações do Ciclista */}
                <View style={styles.linhaInfo}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#2E7D32" />
                  <View>
                    <Text style={styles.label}>Cliente</Text>
                    <Text style={styles.valor}>{pedido.user?.nome}</Text>
                  </View>
                </View>

                <View style={styles.linhaInfo}>
                  <MaterialCommunityIcons name="phone-outline" size={20} color="#2E7D32" />
                  <View>
                    <Text style={styles.label}>Telefone</Text>
                    <Text style={styles.valor}>{pedido.user?.telefone || pedido.telefone}</Text>
                  </View>
                </View>

                <View style={styles.linhaInfo}>
                  <MaterialCommunityIcons name="wrench-outline" size={20} color="#2E7D32" />
                  <View>
                    <Text style={styles.label}>Problema</Text>
                    <Text style={styles.valor}>{pedido.problema}</Text>
                  </View>
                </View>

                <View style={styles.linhaInfo}>
                  <MaterialCommunityIcons name="bike" size={20} color="#2E7D32" />
                  <View>
                    <Text style={styles.label}>Bike</Text>
                    <Text style={styles.valor}>{pedido.bike}</Text>
                  </View>
                </View>

                <View style={styles.linhaInfo}>
                  <MaterialCommunityIcons name="map-marker-outline" size={20} color="#2E7D32" />
                  <View>
                    <Text style={styles.label}>Localização</Text>
                    <Text style={styles.valor}>{pedido.localizacao}</Text>
                  </View>
                </View>

                <View style={styles.linhaInfo}>
                  <MaterialCommunityIcons name="cash" size={20} color="#2E7D32" />
                  <View>
                    <Text style={styles.label}>Pagamento</Text>
                    <Text style={styles.valor}>{pedido.pagamento || "Dinheiro / PIX"}</Text>
                  </View>
                </View>

              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FBF4" },
  container: { flex: 1, backgroundColor: "#F4FBF4" },
  content: { padding: 16, paddingBottom: 30 },
  titulo: { fontSize: 26, fontWeight: "bold", color: "#1E2A38" },
  subtitulo: { color: "#5F6B7A", marginBottom: 16 },
  cardVazio: { backgroundColor: "#FFFFFF", borderRadius: 20, marginTop: 20 },
  cardVazioContent: { alignItems: "center", paddingVertical: 30 },
  cardVazioTexto: { color: "#6B7280", fontSize: 16, fontWeight: "bold", marginTop: 12 },
  cardVazioSubtexto: { color: "#9E9E9E", fontSize: 13, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, marginBottom: 16 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codigo: { fontSize: 16, fontWeight: "bold", color: "#1E2A38" },
  data: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  chipStatus: { backgroundColor: "#E8F5E9" },
  chipTexto: { color: "#2E7D32", fontWeight: "bold", fontSize: 12 },
  divider: { marginVertical: 12 },
  linhaInfo: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  label: { fontSize: 11, color: "#6B7280" },
  valor: { fontSize: 14, fontWeight: "bold", color: "#1E2A38" },
});