import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Avatar, Button, Card, Chip, Divider, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Avaliacao = {
  nota: number;
  comentario?: string;
};

type Pedido = {
  id: string;
  codigo: string;
  tipo: string;
  problema: string;
  bike: string;
  localizacao: string;
  pagamento?: string;
  status: string;
  tecnicoSolicitadoId?: string | null;
  createdAt: string;
  user: {
    nome: string;
    telefone: string;
  };
  avaliacao?: Avaliacao;
};

export default function Home() {
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([]);
  const [pedidosEmAndamento, setPedidosEmAndamento] = useState<Pedido[]>([]);
  const [historico, setHistorico] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeTecnico, setNomeTecnico] = useState("");
  const [verTodosPedidos, setVerTodosPedidos] = useState(false);
  const [verTodosHistorico, setVerTodosHistorico] = useState(false);

  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  async function carregarDados() {
    try {
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      if (!userId) return;

      const resUsuario = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`);
      const usuario = await resUsuario.json();
      setNomeTecnico(usuario.nome || "Técnico");

      const resDisponiveis = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/disponiveis?tecnicoId=${userId}`);
      const disponiveis = await resDisponiveis.json();
      setPedidosDisponiveis(Array.isArray(disponiveis) ? disponiveis : []);

      const resAndamento = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/tecnico/${userId}`);
      const andamento = await resAndamento.json();
      setPedidosEmAndamento(Array.isArray(andamento) ? andamento : []);

      const resHistorico = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/historico`);
      const hist: Pedido[] = await resHistorico.json();
      
      if (Array.isArray(hist)) {
        const apenasConcluidos = hist.filter((p) => p.status === "Finalizado");
        setHistorico(apenasConcluidos);
      } else {
        setHistorico([]);
      }
    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function aceitarPedido(id: string) {
    try {
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      if (!userId) {
        Alert.alert("Erro de Autenticação", "ID do técnico não encontrado no armazenamento local. Faça login novamente.");
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Aceito pelo técnico",
          tecnicoId: userId,
        }),
      });

      if (response.ok) {
        Alert.alert("Sucesso", "Pedido aceito! Acompanhe em Meus Serviços.");
        setPedidoSelecionado(null);
        carregarDados();
      } else {
        const errData = await response.json();
        console.log("Erro da API ao aceitar:", errData);
        Alert.alert("Aviso", errData.mensagem || "Não foi possível aceitar o pedido");
      }
    } catch (error) {
      console.log("Erro de rede/catch:", error);
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
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
        Alert.alert("Pedido rejeitado", "O pedido foi recusado.");
        setPedidoSelecionado(null);
        carregarDados();
      } else {
        const errData = await response.json();
        Alert.alert("Aviso", errData.mensagem || "Não foi possível rejeitar o pedido");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString("pt-BR");
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
              <Text style={styles.titulo}>Painel do Técnico</Text>
              <Text style={styles.subtitulo}>Olá, {nomeTecnico}!👋</Text>
            </View>
          </View>
          <IconButton icon="bell-outline" iconColor="#2E7D32" size={26} />
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
              <Text style={styles.numero}>{historico.length}</Text>
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
        ) : pedidosDisponiveis.length === 0 ? (
          <Card style={styles.cardVazio}>
            <Card.Content style={styles.cardVazioContent}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={40} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Nenhum pedido disponível</Text>
            </Card.Content>
          </Card>
        ) : (
          pedidosVisiveis.map((pedido) => (
            <TouchableOpacity key={pedido.id} activeOpacity={0.8} onPress={() => setPedidoSelecionado(pedido)}>
              <Card style={styles.cardPedido}>
                <Card.Content>
                  <View style={styles.topoPedido}>
                    <View style={styles.codigoBox}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#1565C0" />
                      <Text style={styles.codigo}>#{pedido.codigo}</Text>
                      {pedido.tecnicoSolicitadoId && (
                        <View style={styles.tagDirecionado}>
                          <Text style={styles.tagDirecionadoTexto}>Direcionado a você</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.toqueDetalhes}>Toque para responder</Text>
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
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* HISTÓRICO RECENTE */}
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
              <Text style={styles.cardVazioTexto}>Nenhum serviço concluído ainda</Text>
            </Card.Content>
          </Card>
        ) : (
          historicoVisivel.map((pedido) => (
            <Card key={pedido.id} style={styles.cardHistorico}>
              <Card.Content>
                <View style={styles.topoPedido}>
                  <View style={styles.codigoBox}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#1565C0" />
                    <Text style={styles.codigo}>#{pedido.codigo}</Text>

                    {pedido.avaliacao && (
                      <View style={styles.tagAvaliacaoTopo}>
                        <MaterialCommunityIcons name="star" size={14} color="#D97706" />
                        <Text style={styles.tagAvaliacaoNota}>{pedido.avaliacao.nota.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  <Chip style={styles.chipFinalizadoFoto} textStyle={styles.chipTextoFoto}>
                    Finalizado
                  </Chip>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.infoTexto}><Text style={{ fontWeight: "bold" }}>Problema:</Text> {pedido.problema}</Text>
                  <Text style={styles.dataTexto}>Data: {formatarData(pedido.createdAt)}</Text>
                </View>

                {pedido.avaliacao?.comentario && (
                  <View style={styles.boxComentario}>
                    <Text style={styles.comentarioTexto}>"{pedido.avaliacao.comentario}"</Text>
                  </View>
                )}

              </Card.Content>
            </Card>
          ))
        )}

      </ScrollView>

      {/* MODAL DE DETALHES + ACEITAR/REJEITAR */}
      <Modal
        visible={!!pedidoSelecionado}
        transparent
        animationType="slide"
        onRequestClose={() => setPedidoSelecionado(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Pedido #{pedidoSelecionado?.codigo}</Text>
            
            {pedidoSelecionado?.tecnicoSolicitadoId && (
              <View style={[styles.tagDirecionado, { alignSelf: "flex-start", marginTop: 4, marginBottom: 8 }]}>
                <Text style={styles.tagDirecionadoTexto}>Este cliente escolheu você especificamente!</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="account-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}><Text style={{ fontWeight: "bold" }}>Cliente:</Text> {pedidoSelecionado?.user?.nome}</Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="phone-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}><Text style={{ fontWeight: "bold" }}>Telefone:</Text> {pedidoSelecionado?.user?.telefone}</Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="wrench-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}><Text style={{ fontWeight: "bold" }}>Problema:</Text> {pedidoSelecionado?.problema}</Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="bike" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}><Text style={{ fontWeight: "bold" }}>Bike:</Text> {pedidoSelecionado?.bike}</Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}><Text style={{ fontWeight: "bold" }}>Local:</Text> {pedidoSelecionado?.localizacao}</Text>
            </View>

            <View style={styles.modalAcoes}>
              <Button
                mode="contained"
                buttonColor="#2E7D32"
                style={{ flex: 1, borderRadius: 10 }}
                onPress={() => pedidoSelecionado && aceitarPedido(pedidoSelecionado.id)}
              >
                Aceitar
              </Button>
              <Button
                mode="outlined"
                textColor="#D32F2F"
                style={{ flex: 1, borderColor: "#D32F2F", borderRadius: 10 }}
                onPress={() => pedidoSelecionado && rejeitarPedido(pedidoSelecionado.id)}
              >
                Rejeitar
              </Button>
            </View>

            <TouchableOpacity style={styles.fecharModal} onPress={() => setPedidoSelecionado(null)}>
              <Text style={styles.fecharModalTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FBF4" },
  container: { flex: 1, backgroundColor: "#F4FBF4" },
  content: { padding: 16, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  headerEsquerda: { flexDirection: "row", alignItems: "center" },
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
  cardPedido: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 12 },
  toqueDetalhes: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },
  cardHistorico: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  topoPedido: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codigoBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  codigo: { fontSize: 16, fontWeight: "bold", color: "#1565C0" },
  tagDirecionado: { backgroundColor: "#E0F2FE", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagDirecionadoTexto: { fontSize: 11, fontWeight: "bold", color: "#0369A1" },
  tagAvaliacaoTopo: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 2, marginLeft: 4 },
  tagAvaliacaoNota: { fontSize: 12, fontWeight: "bold", color: "#D97706" },
  divider: { marginVertical: 10 },
  infoLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  infoTexto: { fontSize: 14, color: "#374151" },
  dataTexto: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  boxComentario: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 8, marginTop: 8 },
  comentarioTexto: { fontStyle: "italic", color: "#4B5563", fontSize: 13 },
  chipFinalizadoFoto: { backgroundColor: "#1E5E20", borderRadius: 10 },
  chipTextoFoto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 20, fontWeight: "bold", color: "#1E2A38" },
  infoLinhaModal: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoTextoModal: { fontSize: 15, color: "#374151" },
  modalAcoes: { flexDirection: "row", gap: 10, marginTop: 20 },
  fecharModal: { alignItems: "center", marginTop: 14 },
  fecharModalTexto: { color: "#6B7280", fontSize: 14, fontWeight: "bold" },
});