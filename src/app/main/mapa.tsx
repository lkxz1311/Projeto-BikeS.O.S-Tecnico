import React, { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { Text } from "react-native-paper";

import {
  CATEGORY_META,
  JARDIM_REGION,
  type PointOfInterest,
} from "../../constants/mapPoints";

import { enviarLocalizacaoTecnico } from "../../services/localizacaoService";

const MAP_STYLE_HIDE_STORES = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

export default function Mapa() {
  const mapRef = useRef<MapView>(null);
  const modalMapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selecionado, setSelecionado] = useState<PointOfInterest | null>(null);
  const [permissao, setPermissao] = useState<Location.PermissionResponse | null>(null);
  const [expandido, setExpandido] = useState(false);

  const [pedidoId, setPedidoId] = useState<string | null>(null);

  useEffect(() => {
    async function carregarPedidoAtivo() {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        if (!apiUrl) return;

        const res = await fetch(`${apiUrl}/pedidos/em-andamento`);
        if (res.ok) {
          const data = await res.json();
          // Aceita tanto objeto único quanto array
          const pedido = Array.isArray(data) ? data[0] : data;
          if (pedido?.id) {
            setPedidoId(pedido.id);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar pedido ativo:", error);
      }
    }

    carregarPedidoAtivo();
  }, []);

  // Solicita e monitora permissão de localização
  useEffect(() => {
    let ativo = true;

    (async () => {
      const atual = await Location.getForegroundPermissionsAsync();
      if (!ativo) return;

      if (!atual.granted && atual.canAskAgain) {
        const pedida = await Location.requestForegroundPermissionsAsync();
        if (ativo) setPermissao(pedida);
      } else {
        setPermissao(atual);
      }
    })().catch(() => {});

    return () => {
      ativo = false;
    };
  }, []);

  // 3. Monitoramento e envio do GPS em tempo real (SÓ EXECUTA SE TIVER PERMISSÃO E PEDIDO ID)
  useEffect(() => {
    if (!permissao?.granted || !pedidoId) return;

    let inscricaoGps: Location.LocationSubscription | null = null;

    const iniciarRastreamento = async () => {
      try {
        inscricaoGps = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,   // Envia no máximo a cada 5 segundos
            distanceInterval: 5,  // Ou a cada 5 metros percorridos
          },
          async (posicao) => {
            const { latitude, longitude } = posicao.coords;

            await enviarLocalizacaoTecnico({
              pedidoId,
              latitude,
              longitude,
            }).catch((err) => {
              console.warn("Falha ao sincronizar GPS com a VPS:", err);
            });
          }
        );
      } catch (error) {
        console.error("Erro ao iniciar rastreamento de GPS:", error);
      }
    };

    iniciarRastreamento();

    return () => {
      if (inscricaoGps) {
        inscricaoGps.remove();
      }
    };
  }, [permissao?.granted, pedidoId]);

  const temPermissao = !!permissao?.granted;
  const mostrarAvisoLocalizacao = !!permissao && !permissao.granted;

  const pedirLocalizacao = useCallback(async () => {
    if (permissao?.canAskAgain) {
      const pedida = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (pedida) setPermissao(pedida);
    } else {
      await Linking.openSettings().catch(() => {});
    }
  }, [permissao]);

  const fecharDetalhes = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setSelecionado(null);
    });
  }, [fadeAnim]);

  const ligar = useCallback(async (telefone: string) => {
    const numero = telefone.replace(/[^0-9+]/g, "");
    try {
      await Linking.openURL(`tel:${numero}`);
    } catch {
      Alert.alert("Não foi possível abrir", `Tente discar manualmente: ${telefone}`);
    }
  }, []);

  const comoChegar = useCallback(async (poi: PointOfInterest) => {
    const coords = `${poi.latitude},${poi.longitude}`;
    const url = Platform.select({
      ios: `maps://?daddr=${coords}&dirflg=d`,
      android: `google.navigation:q=${coords}`,
    });

    try {
      await Linking.openURL(url!);
    } catch {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coords}`);
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapaErrorBoundary>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={JARDIM_REGION}
          showsUserLocation={temPermissao}
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          showsBuildings={false}
          toolbarEnabled={false}
          userInterfaceStyle="light"
          customMapStyle={MAP_STYLE_HIDE_STORES}
        />
      </MapaErrorBoundary>

      {/* SOBREPOSIÇÃO DO TOPO */}
      <View style={styles.topoWrapper} pointerEvents="box-none">
        <View style={styles.topoLinha} pointerEvents="box-none">
          <View style={styles.tituloBox}>
            <MaterialCommunityIcons name="navigation-variant" size={16} color="#1565C0" />
            <Text style={styles.tituloTexto}>Clientes</Text>
          </View>

          <TouchableOpacity
            style={styles.botaoExpandir}
            onPress={() => setExpandido(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="fullscreen" size={18} color="#1565C0" />
          </TouchableOpacity>
        </View>

        {mostrarAvisoLocalizacao && (
          <AvisoLocalizacao
            podePerguntar={!!permissao?.canAskAgain}
            onPress={pedirLocalizacao}
          />
        )}
      </View>

      {selecionado && !expandido && (
        <Animated.View style={[styles.painelFlutuante, { opacity: fadeAnim }]}>
          <DetalhesPonto
            poi={selecionado}
            onFechar={fecharDetalhes}
            onLigar={ligar}
            onComoChegar={comoChegar}
          />
        </Animated.View>
      )}

      {/* MODAL EXPANDIDO TELA CHEIA */}
      <Modal visible={expandido} animationType="slide" onRequestClose={() => setExpandido(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalBotaoFechar} onPress={() => setExpandido(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#1E2A38" />
            </TouchableOpacity>
            <Text style={styles.modalTitulo}>Navegação em Tela Cheia</Text>
          </View>

          <View style={styles.modalMapaBox}>
            <MapView
              ref={modalMapRef}
              style={StyleSheet.absoluteFillObject}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              initialRegion={JARDIM_REGION}
              showsUserLocation={temPermissao}
              showsPointsOfInterests={false}
              showsBuildings={false}
              customMapStyle={MAP_STYLE_HIDE_STORES}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

class MapaErrorBoundary extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(error: unknown) {
    console.log("[Mapa] falhou ao renderizar:", error);
  }

  render() {
    if (this.state.erro) {
      return <MapaIndisponivel message="Não foi possível carregar o mapa agora." />;
    }
    return <>{this.props.children}</>;
  }
}

function MapaIndisponivel({ message }: { message: string }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, styles.indisponivel]}>
      <MaterialCommunityIcons name="map-outline" size={48} color="#1565C0" />
      <Text style={styles.indisponivelTexto}>{message}</Text>
    </View>
  );
}

function AvisoLocalizacao({
  podePerguntar,
  onPress,
}: {
  podePerguntar: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.aviso, pressed && styles.pressionado]}
    >
      <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#1565C0" />
      <Text style={styles.avisoTexto} numberOfLines={1}>
        {podePerguntar
          ? "Ative a localização para ver sua posição."
          : "GPS desativado. Toque para configurar."}
      </Text>
      <Text style={styles.avisoCta}>{podePerguntar ? "Permitir" : "Abrir"}</Text>
    </Pressable>
  );
}

function DetalhesPonto({
  poi,
  onFechar,
  onLigar,
  onComoChegar,
}: {
  poi: PointOfInterest;
  onFechar: () => void;
  onLigar: (telefone: string) => void;
  onComoChegar: (poi: PointOfInterest) => void;
}) {
  const meta = CATEGORY_META[poi.category] ?? { label: "CLIENTE", color: "#1565C0" };

  return (
    <View style={styles.detalhes}>
      <View style={styles.detalhesTopo}>
        <View style={styles.categoriaLinha}>
          <View style={[styles.categoriaBolinha, { backgroundColor: meta.color }]} />
          <Text style={[styles.categoriaLabel, { color: meta.color }]}>
            {meta.label.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={onFechar} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.nome} numberOfLines={1}>
        {poi.name}
      </Text>
      <Text style={styles.descricao} numberOfLines={2}>
        {poi.description}
      </Text>

      <View style={styles.infoLinha}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color="#1565C0" />
        <Text style={styles.infoTexto} numberOfLines={1}>
          {poi.address}
        </Text>
      </View>

      {poi.hours && (
        <View style={styles.infoLinha}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#1565C0" />
          <Text style={styles.infoTexto} numberOfLines={1}>
            {poi.hours}
          </Text>
        </View>
      )}

      <View style={styles.acoes}>
        {poi.phone && (
          <Pressable
            onPress={() => onLigar(poi.phone!)}
            style={({ pressed }) => [styles.botao, pressed && styles.pressionado]}
          >
            <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" />
            <Text style={styles.botaoTexto}>Ligar</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => onComoChegar(poi)}
          style={({ pressed }) => [
            styles.botao,
            styles.botaoSecundario,
            pressed && styles.pressionado,
          ]}
        >
          <MaterialCommunityIcons name="navigation-variant" size={16} color="#1565C0" />
          <Text style={[styles.botaoTexto, styles.botaoTextoSecundario]}>Como chegar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", position: "relative" },

  topoWrapper: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  topoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tituloBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tituloTexto: { fontSize: 12, fontWeight: "bold", color: "#1E2A38" },

  botaoExpandir: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avisoTexto: { flex: 1, fontSize: 12, color: "#374151" },
  avisoCta: { fontSize: 12, fontWeight: "bold", color: "#1565C0" },

  indisponivel: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: "#FFFFFF",
  },
  indisponivelTexto: { fontSize: 14, color: "#5F6B7A", textAlign: "center", lineHeight: 20 },

  painelFlutuante: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  detalhes: { gap: 6 },
  detalhesTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoriaLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  categoriaBolinha: { width: 8, height: 8, borderRadius: 4 },
  categoriaLabel: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.8 },

  nome: { fontSize: 15, fontWeight: "bold", color: "#1E2A38" },
  descricao: { fontSize: 12, color: "#374151", lineHeight: 16 },

  infoLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  infoTexto: { flex: 1, fontSize: 12, color: "#374151" },

  acoes: { flexDirection: "row", gap: 8, marginTop: 8 },
  botao: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1565C0",
  },
  botaoSecundario: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#1565C0" },
  botaoTexto: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  botaoTextoSecundario: { color: "#1565C0" },
  pressionado: { opacity: 0.75, transform: [{ scale: 0.98 }] },

  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalBotaoFechar: { padding: 4 },
  modalTitulo: { fontSize: 16, fontWeight: "bold", color: "#1E2A38" },
  modalMapaBox: { flex: 1, width: "100%" },
});