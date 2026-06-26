import { useState, useCallback } from "react";
import { ScrollView, StyleSheet, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Chip, Text, Divider, ActivityIndicator } from "react-native-paper";
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/emandamento`);
      const data = await response.json();
      setPedidos(data);
    } catch (error) {
      console.log("Erro ao carregar serviços:", error);
    } finally {
      setLoading(false);
    }
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (response.ok) {
        if (novoStatus === "Finalizado") {
          Alert.alert("Serviço concluído!", "O cliente foi notificado.");
        } else {
          Alert.alert("Status atualizado!", `Novo status: ${novoStatus}`);
        }
        carregarPedidos();
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o status");
    }
  }

  async function rejeitarPedido(id: string) {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Rejeitado" }),
      });

      if (response.ok) {
        Alert.alert("Pedido rejeitado", "O pedido foi removido dos seus serviços.");
        carregarPedidos();
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível rejeitar o pedido");
    }
  }

  function proximoStatus(status: string): string {
    if (status === "Técnico aceitou") return "Técnico a caminho";
    if (status === "Técnico a caminho") return "Em atendimento";
    if (status === "Em atendimento") return "Finalizado";
    return status;
  }

  function textoBotao(status: string): string {
    if (status === "Técnico aceitou") return "Marcar como a caminho";
    if (status === "Técnico a caminho") return "Iniciar atendimento";
    if (status === "Em atendimento") return "Finalizar serviço";
    return "Atualizar status";
  }

  function iconeBotao(status: string): string {
    if (status === "Técnico aceitou") return "bike-fast";
    if (status === "Técnico a caminho") return "wrench";
    if (status === "Em atendimento") return "check-circle";
    return "progress-clock";
  }

  function corChip(status: string): string {
    if (status === "Técnico aceitou") return "#1565C0";
    if (status === "Técnico a caminho") return "#F59E0B";
    if (status === "Em atendimento") return "#2E7D32";
    return "#9E9E9E";
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.titulo}>Meus Serviços</Text>
        <Text style={styles.subtitulo}>Pedidos que você está atendendo.</Text>

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
                  <Chip style={[styles.chipStatus, { backgroundColor: corChip(pedido.status) }]} textStyle={styles.chipTexto}>
                    {pedido.status}
                  </Chip>
                </View>

                <Divider style={styles.divider} />

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
                    <Text style={styles.valor}>{pedido.pagamento}</Text>
                  </View>
                </View>

                {/* BARRA DE PROGRESSO */}
                <View style={styles.progressoContainer}>
                  {["Técnico aceitou", "Técnico a caminho", "Em atendimento", "Finalizado"].map((etapa, index) => (
                    <View key={etapa} style={styles.progressoEtapa}>
                      <View style={[
                        styles.progressoCirculo,
                        pedido.status === etapa || ["Técnico a caminho", "Em atendimento", "Finalizado"].slice(index).includes(pedido.status)
                          ? styles.progressoAtivo
                          : styles.progressoInativo
                      ]}>
                        <MaterialCommunityIcons
                          name={index === 0 ? "check" : index === 1 ? "bike-fast" : index === 2 ? "wrench" : "flag-checkered"}
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                      {index < 3 && <View style={styles.progressoLinha} />}
                    </View>
                  ))}
                </View>

                <View style={styles.areaBotoes}>
                  <Button
                    mode="contained"
                    buttonColor={pedido.status === "Em atendimento" ? "#1565C0" : "#2E7D32"}
                    style={styles.botaoPrincipal}
                    icon={iconeBotao(pedido.status)}
                    onPress={() => {
                      const proximo = proximoStatus(pedido.status);
                      if (proximo === "Finalizado") {
                        Alert.alert(
                          "Finalizar serviço",
                          "Confirma que o serviço foi concluído?",
                          [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Confirmar", onPress: () => atualizarStatus(pedido.id, proximo) },
                          ]
                        );
                      } else {
                        atualizarStatus(pedido.id, proximo);
                      }
                    }}
                  >
                    {textoBotao(pedido.status)}
                  </Button>

                  <Button
                    mode="outlined"
                    textColor="#D32F2F"
                    style={styles.botaoRejeitar}
                    onPress={() => Alert.alert(
                      "Rejeitar pedido",
                      "Tem certeza que quer rejeitar esse pedido?",
                      [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Rejeitar", onPress: () => rejeitarPedido(pedido.id) },
                      ]
                    )}
                  >
                    Rejeitar pedido
                  </Button>
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
  chipStatus: { borderRadius: 999 },
  chipTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  divider: { marginVertical: 14, backgroundColor: "#E5E7EB" },
  linhaInfo: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 10 },
  label: { fontSize: 12, color: "#6B7280" },
  valor: { fontSize: 15, color: "#1E2A38", fontWeight: "600", marginTop: 1 },
  progressoContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 16 },
  progressoEtapa: { flexDirection: "row", alignItems: "center" },
  progressoCirculo: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  progressoAtivo: { backgroundColor: "#2E7D32" },
  progressoInativo: { backgroundColor: "#D1D5DB" },
  progressoLinha: { width: 30, height: 3, backgroundColor: "#D1D5DB" },
  areaBotoes: { gap: 8 },
  botaoPrincipal: { borderRadius: 12, paddingVertical: 3 },
  botaoRejeitar: { borderColor: "#D32F2F", borderRadius: 12 },
});