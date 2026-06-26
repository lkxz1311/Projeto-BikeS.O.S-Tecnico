import { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Button, Card, Text, TextInput, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cadastrarService } from "../../services/cadastrarService";

export default function Cadastro() {
  const [etapa, setEtapa] = useState(1);
  const [empresa, setEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  function formatarTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);
    if (numeros.length <= 2) return `(${numeros}`;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  }

  function formatarCnpj(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
    if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
    if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12, 14)}`;
  }

  function avancarEtapa() {
    if (!empresa || !telefone || !email || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos!");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Erro", "E-mail inválido");
      return;
    }
    if (telefone.replace(/\D/g, "").length < 11) {
      Alert.alert("Erro", "Telefone deve ter 11 dígitos");
      return;
    }
    setEtapa(2);
  }

  async function finalizar() {
    if (cnpj.replace(/\D/g, "").length !== 14) {
      Alert.alert("Erro", "CNPJ inválido");
      return;
    }

    setLoading(true);
    try {
      const resultado = await cadastrarService({
        nome: empresa,
        email,
        telefone,
        senha,
      });

      if (!resultado.ok) {
        Alert.alert("Erro", resultado.erro || "Falha ao cadastrar");
        return;
      }

      await AsyncStorage.setItem("userId", String(resultado.data?.id));

      Alert.alert("Sucesso", "Empresa cadastrada com sucesso!", [
        { text: "OK", onPress: () => router.replace("/main/home") },
      ]);

    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.titulo}>Cadastro da Empresa</Text>
        <Text style={styles.subtitulo}>Etapa {etapa} de 2</Text>

        {etapa === 1 ? (
          <>
            <TextInput label="Nome da empresa" mode="outlined" value={empresa} onChangeText={setEmpresa} style={styles.input} activeOutlineColor="#2E7D32" left={<TextInput.Icon icon="store" color="#2E7D32" disabled />} />
            <TextInput label="Telefone" mode="outlined" value={telefone} onChangeText={(text) => setTelefone(formatarTelefone(text))} keyboardType="phone-pad" placeholder="(67) 99999-9999" style={styles.input} activeOutlineColor="#2E7D32" left={<TextInput.Icon icon="phone" color="#2E7D32" disabled />} />
            <TextInput label="Email" mode="outlined" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} activeOutlineColor="#2E7D32" left={<TextInput.Icon icon="email" color="#2E7D32" disabled />} />
            <TextInput label="Senha" mode="outlined" value={senha} onChangeText={setSenha} secureTextEntry={!mostrarSenha} style={styles.input} activeOutlineColor="#2E7D32" left={<TextInput.Icon icon="lock" color="#2E7D32" disabled />} right={<TextInput.Icon icon={mostrarSenha ? "eye-off" : "eye"} onPress={() => setMostrarSenha(!mostrarSenha)} color="#2E7D32" />} />

            <Button mode="contained" buttonColor="#2E7D32" style={styles.botao} onPress={avancarEtapa}>
              Próxima etapa
            </Button>

            <Text style={styles.texto}>
              Já tem conta?{" "}
              <Text style={styles.link} onPress={() => router.replace("/auth/login")}>Fazer login</Text>
            </Text>
          </>
        ) : (
          <>
            <TextInput label="CNPJ" mode="outlined" value={cnpj} onChangeText={(text) => setCnpj(formatarCnpj(text))} placeholder="00.000.000/0000-00" keyboardType="number-pad" style={styles.input} activeOutlineColor="#2E7D32" left={<TextInput.Icon icon="file-document-outline" color="#2E7D32" disabled />} />

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitulo}>Banner da empresa</Text>
                <Text style={styles.cardTexto}>Opcional no MVP. Pode adicionar depois.</Text>
              </Card.Content>
            </Card>

            <Button mode="contained" buttonColor="#2E7D32" style={styles.botao} onPress={finalizar} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : "Finalizar cadastro"}
            </Button>

            <Button textColor="#2E7D32" onPress={() => setEtapa(1)}>Voltar etapa</Button>

            <Text style={styles.texto}>
              Já tem conta?{" "}
              <Text style={styles.link} onPress={() => router.replace("/auth/login")}>Fazer login</Text>
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FBF4" },
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#F4FBF4" },
  titulo: { fontSize: 26, fontWeight: "bold", color: "#2E7D32", textAlign: "center", marginBottom: 6 },
  subtitulo: { color: "#5F6B7A", textAlign: "center", marginBottom: 20 },
  input: { marginBottom: 12, backgroundColor: "#FFFFFF" },
  botao: { marginTop: 10, paddingVertical: 5 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 14 },
  cardTitulo: { fontWeight: "bold", fontSize: 16, color: "#1E2A38" },
  cardTexto: { color: "#5F6B7A", marginTop: 4 },
  texto: { marginTop: 16, textAlign: "center" },
  link: { color: "#2E7D32", fontWeight: "bold" },
});