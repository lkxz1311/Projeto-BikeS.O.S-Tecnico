import { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { TextInput, Button, Text, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginService } from "../../services/loginService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos!");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Erro", "E-mail inválido");
      return;
    }

    setLoading(true);
    try {
      const resultado = await loginService({ email, senha });

      if (!resultado.ok) {
        Alert.alert("Erro", resultado.erro || "Falha ao fazer login");
        return;
      }

      await AsyncStorage.setItem("userId", String(resultado.data?.id));

      setEmail("");
      setSenha("");

      router.replace("/main/home");

    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.titulo}>Login do Técnico</Text>

        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          activeOutlineColor="#2E7D32"
          left={<TextInput.Icon icon="email" color="#2E7D32" disabled />}
        />

        <TextInput
          label="Senha"
          mode="outlined"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          style={styles.input}
          activeOutlineColor="#2E7D32"
          left={<TextInput.Icon icon="lock" color="#2E7D32" disabled />}
          right={
            <TextInput.Icon
              icon={mostrarSenha ? "eye-off" : "eye"}
              onPress={() => setMostrarSenha(!mostrarSenha)}
              color="#2E7D32"
            />
          }
        />

        <Button
          mode="contained"
          buttonColor="#2E7D32"
          style={styles.botao}
          onPress={entrar}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : "Entrar"}
        </Button>

        <Text style={styles.texto}>
          Ainda não tem conta?{" "}
          <Text style={styles.link} onPress={() => router.push("/auth/cadastro")}>
            Cadastre sua empresa
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4FBF4" },
  container: { flex: 1, justifyContent: "center", padding: 20 },
  titulo: { fontSize: 26, fontWeight: "bold", color: "#2E7D32", textAlign: "center", marginBottom: 20 },
  input: { marginBottom: 12, backgroundColor: "#FFFFFF" },
  botao: { marginTop: 10, paddingVertical: 5 },
  texto: { marginTop: 16, textAlign: "center" },
  link: { color: "#2E7D32", fontWeight: "bold" },
});