import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOW } from "../constants/theme";

interface Props extends TextInputProps {
  label?: string;
  icon?: string;
  isPassword?: boolean;
}

export default function StyledInput({
  label,
  icon,
  isPassword = false,
  ...props
}: Props): React.JSX.Element {
  const [showPass, setShowPass] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={isPassword && !showPass}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Text style={styles.eyeIcon}>{showPass ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    ...SHADOW.card,
  },
  icon: { fontSize: 18 },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark },
  eyeIcon: { fontSize: 18 },
});
