import { useState, useCallback } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Card, Chip, Divider, IconButton, Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Pedido = {
  id: string;
  codigo: string;
  tipo: string;
  problema: string;
  bike: string;
  localizacao: string;
  status: string;
  createdAt: string;
  user: {
    nome: string;
    telefone: string;
  };
};

export default function Home() {
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([]);
  const [pedidosEmAndamento, setPedidosEmAndamento] = useState<Pedido[]>([]);
  const [historico, setHistorico] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeTecnico, setNomeTecnico] = useState("");
  const [online, setOnline] = useState(true);
  const [verTodosPedidos, setVerTodosPedidos] = useState(false);
  const [verTodosHistorico, setVerTodosHistorico] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  async function carregarDados() {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const resUsuario = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`);
      const usuario = await resUsuario.json();
      setNomeTecnico(usuario.nome || "Técnico");

      const resDisponiveis = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/disponiveis`);
      const disponiveis = await resDisponiveis.json();
      setPedidosDisponiveis(Array.isArray(disponiveis) ? disponiveis : []);

      const resAndamento = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/emandamento`);
      const andamento = await resAndamento.json();
      setPedidosEmAndamento(Array.isArray(andamento) ? andamento : []);

      // Busca histórico — pedidos finalizados ou rejeitados
      const resHistorico = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/historico`);
      const hist = await resHistorico.json();
      setHistorico(Array.isArray(hist) ? hist : []);

    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function aceitarPedido(id: string) {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Técnico aceitou" }),
      });

      if (response.ok) {
        Alert.alert("Sucesso", "Pedido aceito! Veja em Serviços.");
        carregarDados();
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível aceitar o pedido");
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function labelTipo(tipo: string) {
    if (tipo === "sos") return "SOS";
    if (tipo === "agendado") return "Agendado";
    return "Normal";
  }

  function corChip(tipo: string) {
    if (tipo === "sos") return styles.chipSOS;
    if (tipo === "agendado") return styles.chipAgendado;
    return styles.chipNormal;
  }

  const pedidosVisiveis = verTodosPedidos ? pedidosDisponiveis : pedidosDisponiveis.slice(0, 2);
  const historicoVisivel = verTodosHistorico ? historico : historico.slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerEsquerda}>
            <Avatar.Icon size={52} icon="store" color="#FFFFFF" style={styles.avatar} />
            <View>
              <Text style={styles.titulo}>Painel do técnico</Text>
              <Text style={styles.subtitulo}>{nomeTecnico}</Text>
            </View>
          </View>
          <View style={styles.headerDireita}>
            <Text style={[styles.statusTexto, { color: online ? "#2E7D32" : "#9E9E9E" }]}>
              {online ? "Online" : "Offline"}
            </Text>
            <Switch
              value={online}
              onValueChange={(val) => {
                setOnline(val);
                Alert.alert(
                  val ? "Você está Online" : "Você está Offline",
                  val ? "Agora você pode receber pedidos." : "Você não receberá novos pedidos."
                );
              }}
              trackColor={{ false: "#D1D5DB", true: "#A5D6A7" }}
              thumbColor={online ? "#2E7D32" : "#9E9E9E"}
            />
            <IconButton icon="bell-outline" iconColor="#2E7D32" size={24} />
          </View>
        </View>

        {/* RESUMO */}
        <View style={styles.grid}>
          <Card style={styles.cardResumo}>
            <Card.Content>
              <View style={styles.iconeBoxLaranja}>
                <MaterialCommunityIcons name="clock-outline" size={26} color="#F59E0B" />
              </View>
              <Text style={styles.numero}>{pedidosDisponiveis.length}</Text>
              <Text style={styles.label}>Disponíveis</Text>
            </Card.Content>
          </Card>

          <Card style={styles.cardResumo}>
            <Card.Content>
              <View style={styles.iconeBoxVerde}>
                <MaterialCommunityIcons name="bike-fast" size={26} color="#2E7D32" />
              </View>
              <Text style={styles.numero}>{pedidosEmAndamento.length}</Text>
              <Text style={styles.label}>Em andamento</Text>
            </Card.Content>
          </Card>

          <Card style={styles.cardResumo}>
            <Card.Content>
              <View style={styles.iconeBoxAzul}>
                <MaterialCommunityIcons name="check-circle-outline" size={26} color="#1565C0" />
              </View>
              <Text style={styles.numero}>{historico.filter(p => p.status === "Finalizado").length}</Text>
              <Text style={styles.label}>Concluídos</Text>
            </Card.Content>
          </Card>
        </View>

        {/* PEDIDOS DISPONÍVEIS */}
        <View style={styles.secaoHeader}>
          <Text style={styles.secaoTitulo}>Pedidos disponíveis</Text>
          {pedidosDisponiveis.length > 2 && (
            <TouchableOpacity onPress={() => setVerTodosPedidos(!verTodosPedidos)}>
              <Text style={styles.verMais}>
                {verTodosPedidos ? "Ver menos" : `Ver todos (${pedidosDisponiveis.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#2E7D32" style={{ marginTop: 20 }} />
        ) : !online ? (
          <Card style={styles.cardVazio}>
            <Card.Content style={styles.cardVazioContent}>
              <MaterialCommunityIcons name="wifi-off" size={40} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Você está offline</Text>
              <Text style={styles.cardVazioSubtexto}>Ative o status online para receber pedidos</Text>
            </Card.Content>
          </Card>
        ) : pedidosDisponiveis.length === 0 ? (
          <Card style={styles.cardVazio}>
            <Card.Content style={styles.cardVazioContent}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={40} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Nenhum pedido disponível</Text>
            </Card.Content>
          </Card>
        ) : (
          pedidosVisiveis.map((pedido) => (
            <Card key={pedido.id} style={[styles.cardPedido, pedido.tipo === "sos" && styles.cardSOS]}>
              <Card.Content>
                <View style={styles.topoPedido}>
                  <View style={styles.codigoBox}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#2E7D32" />
                    <Text style={styles.codigo}>#{pedido.codigo}</Text>
                  </View>
                  <Chip style={corChip(pedido.tipo)} textStyle={[styles.chipTexto, pedido.tipo === "sos" && styles.chipSOSTexto]}>
                    {labelTipo(pedido.tipo)}
                  </Chip>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.infoLinha}>
                  <MaterialCommunityIcons name="account-outline" size={16} color="#6B7280" />
                  <Text style={styles.infoTexto}>{pedido.user?.nome}</Text>
                </View>
                <View style={styles.infoLinha}>
                  <MaterialCommunityIcons name="wrench-outline" size={16} color="#6B7280" />
                  <Text style={styles.infoTexto}>{pedido.problema}</Text>
                </View>
                <View style={styles.infoLinha}>
                  <MaterialCommunityIcons name="bike" size={16} color="#6B7280" />
                  <Text style={styles.infoTexto}>{pedido.bike}</Text>
                </View>
                <View style={styles.infoLinha}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6B7280" />
                  <Text style={styles.infoTexto}>{pedido.localizacao}</Text>
                </View>

                <TouchableOpacity style={styles.botaoAceitar} onPress={() => aceitarPedido(pedido.id)}>
                  <Text style={styles.botaoAceitarTexto}>Aceitar pedido</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          ))
        )}

        {/* HISTÓRICO */}
        <View style={styles.secaoHeader}>
          <Text style={styles.secaoTitulo}>Histórico recente</Text>
          {historico.length > 3 && (
            <TouchableOpacity onPress={() => setVerTodosHistorico(!verTodosHistorico)}>
              <Text style={styles.verMais}>
                {verTodosHistorico ? "Ver menos" : `Ver todos (${historico.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {historico.length === 0 ? (
          <Card style={styles.cardVazio}>
            <Card.Content style={styles.cardVazioContent}>
              <MaterialCommunityIcons name="history" size={40} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Nenhum histórico ainda</Text>
            </Card.Content>
          </Card>
        ) : (
          historicoVisivel.map((pedido) => (
            <Card key={pedido.id} style={styles.cardHistorico}>
              <Card.Content>
                <View style={styles.topoPedido}>
                  <View style={styles.codigoBox}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#2E7D32" />
                    <Text style={styles.codigo}>#{pedido.codigo}</Text>
                  </View>
                  <Chip
                    style={pedido.status === "Finalizado" ? styles.chipConcluido : styles.chipRejeitado}
                    textStyle={styles.chipTexto}
                  >
                    {pedido.status}
                  </Chip>
                </View>
                <Text style={styles.infoTexto}>{pedido.user?.nome} — {pedido.problema}</Text>
                <Text style={styles.dataTexto}>{formatarData(pedido.createdAt)}</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  headerEsquerda: { flexDirection: "row", alignItems: "center" },
  headerDireita: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusTexto: { fontSize: 13, fontWeight: "bold" },
  avatar: { backgroundColor: "#2E7D32", marginRight: 12 },
  titulo: { fontSize: 22, fontWeight: "bold", color: "#1E2A38" },
  subtitulo: { color: "#5F6B7A", marginTop: 2 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  cardResumo: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18 },
  iconeBoxLaranja: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#FFF7ED", justifyContent: "center", alignItems: "center" },
  iconeBoxVerde: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center" },
  iconeBoxAzul: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#E8F0FE", justifyContent: "center", alignItems: "center" },
  numero: { fontSize: 28, fontWeight: "bold", color: "#1E2A38", marginTop: 10 },
  label: { color: "#5F6B7A", marginTop: 2, fontSize: 12 },
  secaoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  secaoTitulo: { fontSize: 18, fontWeight: "bold", color: "#1E2A38" },
  verMais: { color: "#2E7D32", fontWeight: "bold", fontSize: 14 },
  cardVazio: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 12 },
  cardVazioContent: { alignItems: "center", paddingVertical: 20 },
  cardVazioTexto: { color: "#9E9E9E", marginTop: 8, fontSize: 15 },
  cardVazioSubtexto: { color: "#C4C4C4", marginTop: 4, fontSize: 13 },
  cardPedido: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 12 },
  cardSOS: { borderLeftWidth: 4, borderLeftColor: "#D32F2F" },
  cardHistorico: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 10 },
  topoPedido: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codigoBox: { flexDirection: "row", alignItems: "center" },
  codigo: { marginLeft: 6, fontSize: 15, fontWeight: "bold", color: "#2E7D32" },
  divider: { marginVertical: 10 },
  infoLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  infoTexto: { fontSize: 14, color: "#374151" },
  dataTexto: { fontSize: 12, color: "#9E9E9E", marginTop: 4 },
  botaoAceitar: { backgroundColor: "#2E7D32", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  botaoAceitarTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  chipNormal: { backgroundColor: "#1565C0" },
  chipSOS: { backgroundColor: "#D32F2F" },
  chipAgendado: { backgroundColor: "#F59E0B" },
  chipConcluido: { backgroundColor: "#2E7D32" },
  chipRejeitado: { backgroundColor: "#9E9E9E" },
  chipTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 11 },
  chipSOSTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
});