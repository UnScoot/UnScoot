import * as React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

type Props = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

// Simple placeholder component used to satisfy generated imports like
// `import Component from "../assets/"` in design-exported files.
// It renders an empty View with the requested size so layout stays intact.
const Placeholder = ({ width, height, style }: Props) => (
  <View style={[{ width: width ?? 24, height: height ?? 24 }, style]} />
);

export default Placeholder;
