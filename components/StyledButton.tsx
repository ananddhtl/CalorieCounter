import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";
import { COLORS, RADIUS, SHADOW } from "../constants/theme";

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
}

export default function StyledButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: Props): React.JSX.Element {
  if (variant === "outline") {
    return (
      <TouchableOpacity
        style={[styles.outline, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <Text style={styles.outlineText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === "ghost") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        <Text style={styles.ghostText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.wrapper, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={[COLORS.primary, "#FF8FAB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryText}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: RADIUS.full, overflow: "hidden", ...SHADOW.soft },
  gradient: { paddingVertical: 17, alignItems: "center" },
  primaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  outline: {
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 15,
    alignItems: "center",
  },
  outlineText: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  ghostText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
