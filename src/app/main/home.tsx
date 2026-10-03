import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";

import Mapa from "./mapa";

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
  latitude?: number;
  longitude?: number;
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

// Converte "latitude,longitude" (formato salvo pelo backend quando o cliente envia GPS)
function extrairCoordenadas(texto?: string) {
  const match = texto?.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  return { latitude, longitude };
}

export default function HomeTecnico() {
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([]);
  const [pedidosEmAndamento, setPedidosEmAndamento] = useState<Pedido[]>([]);
  const [historico, setHistorico] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nomeTecnico, setNomeTecnico] = useState("");
  const [verTodosPedidos, setVerTodosPedidos] = useState(false);
  const [verTodosHistorico, setVerTodosHistorico] = useState(false);

  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [tecnicoId, setTecnicoId] = useState<string | null>(null);

  // Estados para rastreamento de rota dinâmica
  const [tecnicoCoords, setTecnicoCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [clienteCoords, setClienteCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  // 1. Inicia monitoramento do GPS do técnico em tempo real
  useEffect(() => {
    let inscricaoGps: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      // Pega posição inicial rapidamente
      const inicial = await Location.getCurrentPositionAsync({});
      setTecnicoCoords({
        latitude: inicial.coords.latitude,
        longitude: inicial.coords.longitude,
      });

      // Atualiza conforme o técnico se movimenta
      inscricaoGps = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Atualiza a cada 10 metros percorridos
        },
        (loc) => {
          setTecnicoCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    })();

    return () => {
      if (inscricaoGps) inscricaoGps.remove();
    };
  }, []);

  // Pedido aceito por este técnico que está em andamento (é ele que gera o rastreamento)
  const pedidoAtivo = pedidosEmAndamento[0];

  // 2. Sempre que houver um pedido em andamento, extrai as coordenadas do cliente
  useEffect(() => {
    if (!pedidoAtivo) {
      setClienteCoords(undefined);
      return;
    }

    // Se o pedido já vier com lat/lng numéricos do backend
    if (pedidoAtivo.latitude && pedidoAtivo.longitude) {
      setClienteCoords({
        latitude: Number(pedidoAtivo.latitude),
        longitude: Number(pedidoAtivo.longitude),
      });
      return;
    }

    // Se a localização foi salva como "latitude,longitude"
    const coordsTexto = extrairCoordenadas(pedidoAtivo.localizacao);
    if (coordsTexto) {
      setClienteCoords(coordsTexto);
      return;
    }

    // Se o pedido tiver apenas o texto do endereço, faz o Geocoding automático
    if (pedidoAtivo.localizacao) {
      Location.geocodeAsync(pedidoAtivo.localizacao)
        .then((resultados) => {
          if (resultados && resultados.length > 0) {
            setClienteCoords({
              latitude: resultados[0].latitude,
              longitude: resultados[0].longitude,
            });
          }
        })
        .catch((err) => console.log("[Geocode Error]:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoAtivo?.id, pedidoAtivo?.localizacao]);

  useFocusEffect(
    useCallback(() => {
      carregarDados();

      // Atualiza periodicamente: novos pedidos e mudanças de status (ex.: cliente finalizou)
      const intervalo = setInterval(carregarDados, 15000);
      return () => clearInterval(intervalo);
    }, [])
  );

  async function carregarDados() {
    try {
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      if (!userId) return;
      setTecnicoId(userId);

      const resUsuario = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`);
      if (resUsuario.ok) {
        const usuario = await resUsuario.json();
        setNomeTecnico(usuario.nome || "Técnico");
      }

      const resDisponiveis = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/pedidos/disponiveis?tecnicoId=${userId}`
      );
      if (resDisponiveis.ok) {
        const disponiveis = await resDisponiveis.json();
        setPedidosDisponiveis(Array.isArray(disponiveis) ? disponiveis : []);
      }

      const resAndamento = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/pedidos/tecnico/${userId}`
      );
      if (resAndamento.ok) {
        const andamento = await resAndamento.json();
        setPedidosEmAndamento(Array.isArray(andamento) ? andamento : []);
      }

      const resHistorico = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/pedidos/historico`);
      if (resHistorico.ok) {
        const hist: Pedido[] = await resHistorico.json();
        if (Array.isArray(hist)) {
          const apenasConcluidos = hist.filter((p) => p.status === "Finalizado");
          setHistorico(apenasConcluidos);
        } else {
          setHistorico([]);
        }
      }
    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }, []);

  async function aceitarPedido(id: string) {
    try {
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      if (!userId) {
        Alert.alert(
          "Erro de Autenticação",
          "ID do técnico não encontrado no armazenamento local."
        );
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
        Alert.alert("Serviço Aceito! 🎯", "A rota até o cliente foi gerada no mapa.");
        setPedidoSelecionado(null);
        await carregarDados();
      } else {
        const errData = await response.json();
        Alert.alert("Aviso", errData.mensagem || "Não foi possível aceitar o pedido");
      }
    } catch (error) {
      console.error("Erro ao aceitar pedido:", error);
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
        Alert.alert("Pedido Rejeitado", "O chamado foi recusado.");
        setPedidoSelecionado(null);
        await carregarDados();
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
          />
        }
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerEsquerda}>
            <Avatar.Icon size={48} icon="store" color="#FFFFFF" style={styles.avatar} />
            <View>
              <Text style={styles.titulo}>Painel do Técnico</Text>
              <Text style={styles.subtitulo}>Olá, {nomeTecnico || "Técnico"}! 👋</Text>
            </View>
          </View>
          <IconButton icon="bell-outline" iconColor="#2E7D32" size={24} />
        </View>

        {/* ÁREA DO MAPA - RECEBE ORIGEM E DESTINO AUTOMATICAMENTE */}
        <View style={styles.secaoHeader}>
        </View>
        <View style={styles.mapaContainer}>
          {/* Enquanto houver pedido aceito, o Mapa envia a localização do técnico ao backend */}
          <Mapa pedidoId={pedidoAtivo?.id ?? null} tecnicoId={tecnicoId} destino={clienteCoords} />
        </View>

        {/* CARDS DE RESUMO */}
        <View style={styles.grid}>
          <Card style={styles.cardResumo}>
            <Card.Content>
              <View style={styles.iconeBoxLaranja}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.numero}>{pedidosDisponiveis.length}</Text>
              <Text style={styles.label}>Disponíveis</Text>
            </Card.Content>
          </Card>

          <Card style={styles.cardResumo}>
            <Card.Content>
              <View style={styles.iconeBoxVerde}>
                <MaterialCommunityIcons name="bike-fast" size={24} color="#2E7D32" />
              </View>
              <Text style={styles.numero}>{pedidosEmAndamento.length}</Text>
              <Text style={styles.label}>Em andamento</Text>
            </Card.Content>
          </Card>

          <Card style={styles.cardResumo}>
            <Card.Content>
              <View style={styles.iconeBoxAzul}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#1565C0" />
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
          <ActivityIndicator color="#2E7D32" style={{ marginVertical: 20 }} />
        ) : pedidosDisponiveis.length === 0 ? (
          <Card style={styles.cardVazio}>
            <Card.Content style={styles.cardVazioContent}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={36} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Nenhum pedido disponível no momento</Text>
            </Card.Content>
          </Card>
        ) : (
          pedidosVisiveis.map((pedido) => (
            <TouchableOpacity
              key={pedido.id}
              activeOpacity={0.8}
              onPress={() => setPedidoSelecionado(pedido)}
            >
              <Card style={styles.cardPedido}>
                <Card.Content>
                  <View style={styles.topoPedido}>
                    <View style={styles.codigoBox}>
                      <MaterialCommunityIcons
                        name="clipboard-text-outline"
                        size={18}
                        color="#1565C0"
                      />
                      <Text style={styles.codigo}>#{pedido.codigo}</Text>
                      {pedido.tecnicoSolicitadoId && (
                        <View style={styles.tagDirecionado}>
                          <Text style={styles.tagDirecionadoTexto}>Direcionado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.toqueDetalhes}>Toque para aceitar</Text>
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
              <MaterialCommunityIcons name="history" size={36} color="#9E9E9E" />
              <Text style={styles.cardVazioTexto}>Nenhum serviço concluído ainda</Text>
            </Card.Content>
          </Card>
        ) : (
          historicoVisivel.map((pedido) => (
            <Card key={pedido.id} style={styles.cardHistorico}>
              <Card.Content>
                <View style={styles.topoPedido}>
                  <View style={styles.codigoBox}>
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      size={18}
                      color="#1565C0"
                    />
                    <Text style={styles.codigo}>#{pedido.codigo}</Text>

                    {pedido.avaliacao && (
                      <View style={styles.tagAvaliacaoTopo}>
                        <MaterialCommunityIcons name="star" size={12} color="#D97706" />
                        <Text style={styles.tagAvaliacaoNota}>
                          {pedido.avaliacao.nota.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Chip style={styles.chipFinalizadoFoto} textStyle={styles.chipTextoFoto}>
                    Finalizado
                  </Chip>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.infoTexto}>
                    <Text style={{ fontWeight: "bold" }}>Problema:</Text> {pedido.problema}
                  </Text>
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

      {/* MODAL DETALHES DO PEDIDO */}
      <Modal
        visible={!!pedidoSelecionado}
        transparent
        animationType="fade"
        onRequestClose={() => setPedidoSelecionado(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Pedido #{pedidoSelecionado?.codigo}</Text>

            {pedidoSelecionado?.tecnicoSolicitadoId && (
              <View style={styles.tagModalDirecionado}>
                <Text style={styles.tagDirecionadoTexto}>Cliente escolheu você!</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="account-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}>
                <Text style={{ fontWeight: "bold" }}>Cliente:</Text> {pedidoSelecionado?.user?.nome}
              </Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="phone-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}>
                <Text style={{ fontWeight: "bold" }}>Telefone:</Text>{" "}
                {pedidoSelecionado?.user?.telefone}
              </Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="wrench-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}>
                <Text style={{ fontWeight: "bold" }}>Problema:</Text> {pedidoSelecionado?.problema}
              </Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="bike" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}>
                <Text style={{ fontWeight: "bold" }}>Bike:</Text> {pedidoSelecionado?.bike}
              </Text>
            </View>
            <View style={styles.infoLinhaModal}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color="#2E7D32" />
              <Text style={styles.infoTextoModal}>
                <Text style={{ fontWeight: "bold" }}>Local:</Text> {pedidoSelecionado?.localizacao}
              </Text>
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

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerEsquerda: { flexDirection: "row", alignItems: "center" },
  avatar: { backgroundColor: "#2E7D32", marginRight: 12 },
  titulo: { fontSize: 20, fontWeight: "bold", color: "#1E2A38" },
  subtitulo: { color: "#5F6B7A", fontSize: 13, marginTop: 1 },

  mapaContainer: {
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },

  grid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  cardResumo: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 18 },
  iconeBoxLaranja: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  iconeBoxVerde: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconeBoxAzul: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  numero: { fontSize: 28, fontWeight: "bold", color: "#1E2A38", marginTop: 10 },
  label: { color: "#5F6B7A", marginTop: 2, fontSize: 12 },
  secaoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  secaoTitulo: { fontSize: 18, fontWeight: "bold", color: "#1E2A38" },
  verMais: { color: "#2E7D32", fontWeight: "bold", fontSize: 14 },
  cardVazio: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 12 },
  cardVazioContent: { alignItems: "center", paddingVertical: 20 },
  cardVazioTexto: { color: "#9E9E9E", marginTop: 8, fontSize: 15 },
  cardPedido: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 12 },
  toqueDetalhes: { fontSize: 12, color: "#2E7D32", fontWeight: "600" },
  cardHistorico: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  topoPedido: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codigoBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  codigo: { fontSize: 16, fontWeight: "bold", color: "#1565C0" },
  tagDirecionado: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagDirecionadoTexto: { fontSize: 11, fontWeight: "bold", color: "#0369A1" },
  tagAvaliacaoTopo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
    marginLeft: 4,
  },
  tagAvaliacaoNota: { fontSize: 12, fontWeight: "bold", color: "#D97706" },
  divider: { marginVertical: 10 },
  infoLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  infoTexto: { fontSize: 14, color: "#374151" },
  dataTexto: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  boxComentario: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 8, marginTop: 8 },
  comentarioTexto: { fontStyle: "italic", color: "#4B5563", fontSize: 13 },
  chipFinalizadoFoto: { backgroundColor: "#1E5E20", borderRadius: 10 },
  chipTextoFoto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20 },
  modalTitulo: { fontSize: 18, fontWeight: "bold", color: "#1E2A38" },
  tagModalDirecionado: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  infoLinhaModal: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoTextoModal: { fontSize: 14, color: "#374151" },
  modalAcoes: { flexDirection: "row", gap: 10, marginTop: 16 },
  fecharModal: { alignItems: "center", marginTop: 12 },
  fecharModalTexto: { color: "#6B7280", fontSize: 13, fontWeight: "bold" },
});