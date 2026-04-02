import { router } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";

export default function Login() {

  const [text, setText] = React.useState('');

  function goToHome() {
    router.push("/");
  }

  return (
    <View style={styles.container}>

<View style={styles.containerDados}>
<TextInput
      label="Email"
      value={text}
      onChangeText={text => setText(text)}
    />

    <TextInput
      label="Senha"
      value={text}
      secureTextEntry
      onChangeText={text => setText(text)}
    />

      <Button mode="contained" onPress={goToHome}>
        Fazer Login
      </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  containerDados: {
    width: "80%",
    gap: 16,
  }
});
