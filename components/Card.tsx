import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { COLORS, RADIUS, SHADOW } from "../constants/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: Props): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
});
