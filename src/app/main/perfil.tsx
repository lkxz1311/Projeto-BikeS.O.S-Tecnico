import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";

export default function Perfil() {
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  // Recarrega os dados ao abrir ou focar na tela
  useFocusEffect(
    useCallback(() => {
      carregarPerfil();
    }, [])
  );

  async function carregarPerfil() {
    try {
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      if (!userId) return sair();

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setEmpresa(data.nome || "");
        setEmail(data.email || "");
        setTelefone(data.telefone || "");
      } else {
        Alert.alert("Aviso", "Não foi possível carregar os dados atualizados");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Função disparada ao arrastar a tela para baixo
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarPerfil();
  }, []);

  async function salvarEdicao() {
    setSalvando(true);
    try {
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: empresa, telefone }),
      });

      if (response.ok) {
        setEditando(false);
        Alert.alert("Sucesso", "Perfil atualizado!");
        carregarPerfil();
      } else {
        Alert.alert("Erro", "Falha ao salvar as alterações");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    } finally {
      setSalvando(false);
    }
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão necessária", "Precisamos de acesso às fotos para alterar sua imagem.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled) setFoto(resultado.assets[0].uri);
  }

  async function sair() {
    await AsyncStorage.multiRemove(["userId", "tecnicoId", "id", "userToken", "token"]);
    router.replace("/auth/login");
  }

  if (loading && !refreshing) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: "#F4FBF4" }} color="#2E7D32" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 30 }}
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
        <View style={styles.header}>
          <View style={styles.fotoArea}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.foto} />
            ) : (
              <Avatar.Icon size={92} icon="store" color="#FFFFFF" style={styles.avatar} />
            )}
            <IconButton
              icon="camera"
              size={20}
              iconColor="#FFFFFF"
              containerColor="#2E7D32"
              style={styles.botaoFoto}
              onPress={escolherFoto}
            />
          </View>
          <Text style={styles.nome}>{empresa || "Técnico"}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <Card style={styles.card}>
          <Card.Title
            title="Informações da empresa"
            right={() => (
              <IconButton
                icon={editando ? "check" : "pencil"}
                iconColor="#2E7D32"
                onPress={editando ? salvarEdicao : () => setEditando(true)}
              />
            )}
          />
          <Card.Content>
            {editando ? (
              <>
                <TextInput
                  label="Empresa"
                  mode="outlined"
                  value={empresa}
                  onChangeText={setEmpresa}
                  style={styles.input}
                  activeOutlineColor="#2E7D32"
                />
                <TextInput
                  label="Telefone"
                  mode="outlined"
                  value={telefone}
                  onChangeText={setTelefone}
                  keyboardType="phone-pad"
                  style={styles.input}
                  activeOutlineColor="#2E7D32"
                />
                <Button
                  mode="contained"
                  buttonColor="#2E7D32"
                  style={styles.botaoSalvar}
                  onPress={salvarEdicao}
                  loading={salvando}
                  disabled={salvando}
                >
                  Salvar alterações
                </Button>
              </>
            ) : (
              <>
                <Text style={styles.label}>Empresa</Text>
                <Text style={styles.value}>{empresa || "Não informado"}</Text>

                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{email || "Não informado"}</Text>

                <Text style={styles.label}>Telefone</Text>
                <Text style={styles.value}>{telefone || "Não informado"}</Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          textColor="#D32F2F"
          style={styles.botaoSair}
          icon="logout"
          onPress={sair}
        >
          Sair da conta
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FBF4" },
  container: { flex: 1, backgroundColor: "#F4FBF4", padding: 16 },
  header: { alignItems: "center", marginBottom: 18 },
  fotoArea: { position: "relative", marginBottom: 12 },
  avatar: { backgroundColor: "#2E7D32" },
  foto: { width: 92, height: 92, borderRadius: 46, backgroundColor: "#D1D5DB" },
  botaoFoto: { position: "absolute", right: -8, bottom: -8 },
  nome: { fontSize: 22, fontWeight: "bold", color: "#1E2A38", textAlign: "center" },
  email: { fontSize: 14, color: "#5F6B7A", marginTop: 4 },
  card: { borderRadius: 18, backgroundColor: "#FFFFFF", marginBottom: 16 },
  label: { fontSize: 13, color: "#6B7A8C", marginTop: 10 },
  value: { fontSize: 16, color: "#1E2A38", fontWeight: "600", marginTop: 2 },
  input: { marginBottom: 10, backgroundColor: "#FFFFFF" },
  botaoSalvar: { marginTop: 8, borderRadius: 12 },
  botaoSair: { borderColor: "#D32F2F", borderRadius: 12 },
});