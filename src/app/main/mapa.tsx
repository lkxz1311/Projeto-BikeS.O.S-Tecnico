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
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Text } from "react-native-paper";

import {
  CATEGORY_META,
  JARDIM_REGION,
  type PointOfInterest,
} from "../../constants/mapPoints";

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

type Coordenada = { latitude: number; longitude: number };

type EnderecoEstruturado = {
  rua: string;
  cidade: string;
  estado: string;
};

type MapaProps = {
  pedidoId?: string | null;
  tecnicoId?: string | null;
  destino?: Coordenada;
  enderecoCliente?: EnderecoEstruturado | string;
};

function validarCoordenada(coords?: Coordenada | null): Coordenada | null {
  if (
    coords &&
    typeof coords.latitude === "number" &&
    !isNaN(coords.latitude) &&
    typeof coords.longitude === "number" &&
    !isNaN(coords.longitude)
  ) {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }
  return null;
}

/**
 * Extrai estritamente apenas o nome da rua para exibição no marcador do mapa
 */
function extrairApenasRua(endereco?: EnderecoEstruturado | string): string {
  if (!endereco) return "Local do Cliente";
  if (typeof endereco === "object" && endereco.rua) {
    return endereco.rua;
  }
  if (typeof endereco === "string") {
    return endereco.split("-")[0].trim();
  }
  return "Local do Cliente";
}

export default function Mapa({ pedidoId = null, tecnicoId = null, destino, enderecoCliente }: MapaProps = {}) {
  const mapRef = useRef<MapView>(null);
  const modalMapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selecionado, setSelecionado] = useState<PointOfInterest | null>(null);
  const [permissao, setPermissao] = useState<Location.PermissionResponse | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [posicaoAtual, setPosicaoAtual] = useState<Coordenada | null>(null);

  const enquadrouRef = useRef(false);

  const destinoValido = validarCoordenada(destino);
  const nomeRuaCliente = extrairApenasRua(enderecoCliente);

  // Permissão de localização
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

  // Monitora localização atual do técnico e sincroniza no Supabase em tempo real
  useEffect(() => {
    if (!permissao?.granted) return;

    let cancelado = false;
    let inscricaoGps: Location.LocationSubscription | null = null;

    const enviarGpsParaBackend = async (lat: number, lng: number) => {
      if (!pedidoId) return;
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
        await fetch(`${apiUrl}/pedidos/${pedidoId}/localizacao-tecnico`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        });
      } catch (err) {
        console.log("Erro ao enviar GPS do técnico ao Supabase:", err);
      }
    };

    const iniciarGps = async () => {
      try {
        const inicial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!cancelado) {
          const lat = inicial.coords.latitude;
          const lng = inicial.coords.longitude;
          setPosicaoAtual({ latitude: lat, longitude: lng });
          enviarGpsParaBackend(lat, lng);
        }

        inscricaoGps = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (posicao) => {
            if (!cancelado) {
              const lat = posicao.coords.latitude;
              const lng = posicao.coords.longitude;
              setPosicaoAtual({ latitude: lat, longitude: lng });
              enviarGpsParaBackend(lat, lng);
            }
          }
        );
      } catch (err) {
        console.log("Erro ao obter GPS local:", err);
      }
    };

    iniciarGps();

    return () => {
      cancelado = true;
      inscricaoGps?.remove();
    };
  }, [permissao?.granted, pedidoId]);

  // Enquadra técnico + cliente no mapa
  useEffect(() => {
    if (!destinoValido || !posicaoAtual || enquadrouRef.current) return;
    enquadrouRef.current = true;
    mapRef.current?.fitToCoordinates([posicaoAtual, destinoValido], {
      edgePadding: { top: 50, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [destinoValido, posicaoAtual]);

  useEffect(() => {
    enquadrouRef.current = false;
  }, [pedidoId]);

  // FUNÇÃO QUE FOCA NA MINHA LOCALIZAÇÃO ATUAL
  const focarMinhaLocalizacao = useCallback(() => {
    if (!posicaoAtual) {
      Alert.alert("GPS", "Obtendo sua localização atual, aguarde um instante...");
      return;
    }

    const cameraConfig = {
      center: posicaoAtual,
      zoom: 16,
      pitch: 0,
      heading: 0,
    };

    mapRef.current?.animateCamera(cameraConfig, { duration: 800 });
    modalMapRef.current?.animateCamera(cameraConfig, { duration: 800 });
  }, [posicaoAtual]);

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
        >
          {/* Marcador do Cliente exibindo APENAS A RUA no visual */}
          {destinoValido && (
            <Marker coordinate={destinoValido} pinColor="#1565C0">
              <Callout tooltip style={styles.calloutContainer}>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitulo}>Atendimento</Text>
                  <Text style={styles.calloutRua}>{nomeRuaCliente}</Text>
                </View>
              </Callout>
            </Marker>
          )}
        </MapView>
      </MapaErrorBoundary>

      {/* SOBREPOSIÇÃO MINIMALISTA DO TOPO EXIBINDO CLIENTE */}
      <View style={styles.topoWrapper} pointerEvents="box-none">
        <View style={styles.topoLinha} pointerEvents="box-none">
          <View style={styles.tituloBox}>
            <MaterialCommunityIcons name="map-marker-account" size={16} color="#1565C0" />
            <Text style={styles.tituloTexto}>Cliente</Text>
          </View>
        </View>

        {mostrarAvisoLocalizacao && (
          <AvisoLocalizacao
            podePerguntar={!!permissao?.canAskAgain}
            onPress={pedirLocalizacao}
          />
        )}
      </View>

      {/* BOTÃO FLUTUANTE DE MINHA LOCALIZAÇÃO NA HOME */}
      <TouchableOpacity
        style={styles.btnGpsHome}
        activeOpacity={0.8}
        onPress={focarMinhaLocalizacao}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#1565C0" />
      </TouchableOpacity>

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
              showsMyLocationButton={false}
              showsPointsOfInterests={false}
              showsBuildings={false}
              customMapStyle={MAP_STYLE_HIDE_STORES}
            >
              {destinoValido && (
                <Marker coordinate={destinoValido} pinColor="#1565C0">
                  <Callout tooltip style={styles.calloutContainer}>
                    <View style={styles.calloutBox}>
                      <Text style={styles.calloutTitulo}>Atendimento</Text>
                      <Text style={styles.calloutRua}>{nomeRuaCliente}</Text>
                    </View>
                  </Callout>
                </Marker>
              )}
            </MapView>

            <TouchableOpacity
              style={styles.btnGpsModal}
              activeOpacity={0.8}
              onPress={focarMinhaLocalizacao}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#1565C0" />
            </TouchableOpacity>
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
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tituloTexto: { fontSize: 12, fontWeight: "bold", color: "#1E2A38" },

  calloutContainer: {
    width: 160,
  },
  calloutBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 4,
  },
  calloutTitulo: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  calloutRua: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1E2A38",
    marginTop: 2,
  },

  btnGpsHome: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10,
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
  modalMapaBox: { flex: 1, width: "100%", position: "relative" },
  btnGpsModal: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "#FFFFFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});