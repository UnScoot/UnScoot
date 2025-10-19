import * as React from "react";
import {StyleSheet, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const StatusRegisterCustomer = () => {
  	
  	return (
    		<SafeAreaView style={styles.viewBg}>
      			<View style={[styles.view, styles.viewBg]} />
    		</SafeAreaView>);
};

const styles = StyleSheet.create({
  	parent: {
    		flex: 1,
    		backgroundColor: "#fff"
  	},
  	viewBg: {
    		backgroundColor: "#fff",
    		flex: 1
  	},
  	view: {
    		width: "100%",
    		height: 330,
    		borderTopLeftRadius: 40,
    		borderTopRightRadius: 40
  	}
});

export default StatusRegisterCustomer;
