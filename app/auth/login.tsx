import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import StyledButton from "../../components/StyledButton";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { supabase } from "../../hooks/useSupabase";

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert("Oops!", "Please fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert("Error", error.message);
    setLoading(false);
  };

  return (
    <LinearGradient colors={["#FFF0F5", "#FFF8FB"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.textMid} />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <View style={styles.iconRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="heart-outline"
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="flower-outline"
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="leaf-outline"
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
              </View>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>
                Sign in to continue your wellness journey
              </Text>
            </View>

            <View style={styles.form}>
              {/* Email input */}
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputBox}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <TextInput
                    style={styles.inputText}
                    placeholder="your@email.com"
                    placeholderTextColor={COLORS.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password input */}
              <View style={{ gap: 6 }}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <TextInput
                    style={styles.inputText}
                    placeholder="Your password"
                    placeholderTextColor={COLORS.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <StyledButton
                label="Sign In"
                onPress={handleLogin}
                loading={loading}
                icon={
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                }
              />
            </View>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => router.push("/auth/signup")}
            >
              <Text style={styles.signupText}>
                Don't have an account?{" "}
                <Text style={styles.signupBold}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 },
  backBtn: {
    paddingTop: 12,
    paddingBottom: 8,
    alignSelf: "flex-start",
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 36,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMid,
    textAlign: "center",
  },
  form: { gap: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    marginLeft: 4,
  },
  // FIX: icon and text sit inline — no overlap
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    ...SHADOW.card,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
  },
  forgotBtn: { alignSelf: "flex-end", marginTop: -4 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
  signupLink: { alignItems: "center", marginTop: 24 },
  signupText: { fontSize: 14, color: COLORS.textMid },
  signupBold: { color: COLORS.primary, fontWeight: "700" },
});
