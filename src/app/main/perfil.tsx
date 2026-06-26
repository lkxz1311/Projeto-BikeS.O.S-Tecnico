import { useState, useEffect } from "react";
import { Image, StyleSheet, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, IconButton, Text, TextInput, ActivityIndicator } from "react-native-paper";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Perfil() {
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return sair();

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`);
      const data = await response.json();

      setEmpresa(data.nome);
      setEmail(data.email);
      setTelefone(data.telefone);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar o perfil");
    } finally {
      setLoading(false);
    }
  }

  async function salvarEdicao() {
    setSalvando(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: empresa, telefone }),
      });

      if (response.ok) {
        setEditando(false);
        Alert.alert("Sucesso", "Perfil atualizado!");
      } else {
        Alert.alert("Erro", "Falha ao salvar");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled) setFoto(resultado.assets[0].uri);
  }

  async function sair() {
    await AsyncStorage.removeItem("userId");
    router.replace("/auth/login");
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2E7D32" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.fotoArea}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.foto} />
            ) : (
              <Avatar.Icon size={92} icon="store" color="#FFFFFF" style={styles.avatar} />
            )}
            <IconButton icon="camera" size={20} iconColor="#FFFFFF" containerColor="#2E7D32" style={styles.botaoFoto} onPress={escolherFoto} />
          </View>
          <Text style={styles.nome}>{empresa}</Text>
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
                <TextInput label="Empresa" mode="outlined" value={empresa} onChangeText={setEmpresa} style={styles.input} activeOutlineColor="#2E7D32" />
                <TextInput label="Telefone" mode="outlined" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" style={styles.input} activeOutlineColor="#2E7D32" />
                <Button mode="contained" buttonColor="#2E7D32" style={styles.botaoSalvar} onPress={salvarEdicao} loading={salvando} disabled={salvando}>
                  Salvar alterações
                </Button>
              </>
            ) : (
              <>
                <Text style={styles.label}>Empresa</Text>
                <Text style={styles.value}>{empresa}</Text>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{email}</Text>
                <Text style={styles.label}>Telefone</Text>
                <Text style={styles.value}>{telefone}</Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Button mode="outlined" textColor="#2E7D32" style={styles.botaoSair} icon="logout" onPress={sair}>
          Sair da conta
        </Button>
      </View>
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
  botaoSair: { borderColor: "#2E7D32", borderRadius: 12 },
});