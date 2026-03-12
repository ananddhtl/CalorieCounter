import { ViewStyle } from "react-native";

export const COLORS = {
  primary: "#FF6B9D",
  primaryLight: "#FFB3CC",
  primaryPale: "#FFE4EE",
  accent: "#C77DFF",
  accentLight: "#E8BAFF",
  peach: "#FFB347",
  peachLight: "#FFE0B2",
  mint: "#56CFE1",
  mintLight: "#C8F4FA",
  green: "#06D6A0",
  greenLight: "#C2F7EA",
  white: "#FFFFFF",
  background: "#FFF8FB",
  surface: "#FFF0F5",
  textDark: "#2D1B33",
  textMid: "#7A5C6E",
  textLight: "#B89FAB",
  success: "#06D6A0",
  warning: "#FFB347",
  danger: "#FF6B6B",
} as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const SHADOW: Record<string, ViewStyle> = {
  soft: {
    shadowColor: "#FF6B9D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    shadowColor: "#2D1B33",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};
