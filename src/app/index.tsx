import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function Index() {
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    verificarSessao();
  }, []);

  async function verificarSessao() {
    try {
      // Procura o ID salvo no armazenamento local
      let userId = await AsyncStorage.getItem("userId");
      if (!userId) userId = await AsyncStorage.getItem("tecnicoId");
      if (!userId) userId = await AsyncStorage.getItem("id");

      if (userId) {
        router.replace("/main/home");
      } else {
        router.replace("/auth/login");
      }
    } catch (error) {
      console.log("Erro ao verificar sessão:", error);
      router.replace("/auth/login");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.texto}>Verificando sessão...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FBF4" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  texto: { fontSize: 14, color: "#2E7D32", fontWeight: "600" },
});