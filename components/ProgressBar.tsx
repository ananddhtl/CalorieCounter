import React from "react";
import { StyleSheet, View } from "react-native";
import { COLORS } from "../constants/theme";

interface Props {
  percent: number; // 0 to 1
  height?: number;
  color?: string;
  trackColor?: string;
}

export default function ProgressBar({
  percent,
  height = 8,
  color = COLORS.primary,
  trackColor = COLORS.surface,
}: Props): React.JSX.Element {
  const clampedPct = Math.min(Math.max(percent, 0), 1);
  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor, borderRadius: height / 2 },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPct * 100}%`,
            height,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden", width: "100%" },
  fill: {},
});
