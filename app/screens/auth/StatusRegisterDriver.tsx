import * as React from "react";
import {StyleSheet, View} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const StatusRegisterDriver = () => {
  	
  	return (
    		<SafeAreaView style={styles.viewBg}>
      			<View style={[styles.view, styles.viewBg]} />
    		</SafeAreaView>);
};

const styles = StyleSheet.create({
  	parent: {
    		flex: 1,
    		backgroundColor: "#000"
  	},
  	viewBg: {
    		backgroundColor: "#000",
    		flex: 1
  	},
  	view: {
    		width: "100%",
    		height: 794,
    		opacity: 0.5
  	}
});

export default StatusRegisterDriver;
