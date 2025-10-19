import { router } from "expo-router";
import * as React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Role = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.view}>
        <Text style={styles.title}>Mau daftar sebagai siapa?</Text>
        
        {/* Driver Option */}
        <TouchableOpacity style={styles.optionContainer} onPress={() => router.push('/screens/auth/RegisterDriver')}>
          <Image 
            style={styles.optionImage} 
            source={require("../../../assets/images/driver.png")}
            resizeMode="contain"
          />
          <Text style={styles.optionText}>Driver</Text>
        </TouchableOpacity>
        
        {/* Passenger Option */}
        <TouchableOpacity style={styles.optionContainer} onPress={() => router.push('/screens/auth/RegisterCustomer')}>
          <Image 
            style={styles.optionImage} 
            source={require("../../../assets/images/Passenger.png")}
            resizeMode="contain"
          />
          <Text style={styles.optionText}>Penumpang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
        				
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  view: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    color: "#4ab100",
    textAlign: "center",
    marginBottom: 60,
    lineHeight: 24,
  },
  optionContainer: {
    width: 270,
    height: 92,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#4ab100",
    marginBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionImage: {
    width: 55,
    height: 55,
    marginRight: 20,
  },
  optionText: {
    fontSize: 16,
    color: "#4ab100",
    fontFamily: "Montserrat-Bold",
    fontWeight: "700",
    textAlign: "center",
  },
});        				export default Role;
        				