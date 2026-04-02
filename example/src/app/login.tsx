import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { StyleSheet } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import * as React from 'react';
import { TextInput } from 'react-native-paper';

export default function LoginScreen() {
  const [text, setText] = React.useState('');

  return (


<SafeAreaView style={styles.safeArea}>
           <TextInput
      label="Email"
      value={text}
      onChangeText={text => setText(text)}
    />
         

      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  }
});