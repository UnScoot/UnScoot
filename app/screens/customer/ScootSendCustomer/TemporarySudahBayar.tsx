import * as React from "react";
import {Text, StyleSheet, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

const TemporarySudahBayar = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Terima kasih — pembayaran diterima</Text>
      </View>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {flex:1, backgroundColor:'#fff'},
  center: {flex:1, justifyContent:'center', alignItems:'center'},
  title: {fontSize:18, fontWeight:'600', color:'#016340'}
});

export default TemporarySudahBayar;
