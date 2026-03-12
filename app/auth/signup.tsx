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
import { ActivityLevel, Gender, GoalType } from "../../constants/types";
import { calcDailyCalories } from "../../hooks/useHealthCalc";
import { supabase } from "../../hooks/useSupabase";

const STEPS = ["Account", "About You", "Goals"];

const ACTIVITY_LEVELS: {
  key: ActivityLevel;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "sedentary", label: "Sedentary", icon: "bed-outline" },
  { key: "light", label: "Light", icon: "walk-outline" },
  { key: "moderate", label: "Moderate", icon: "fitness-outline" },
  { key: "active", label: "Active", icon: "barbell-outline" },
  { key: "very_active", label: "Very Active", icon: "body-outline" },
];

const GOALS: {
  key: GoalType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "lose", label: "Lose Weight", icon: "trending-down-outline" },
  { key: "maintain", label: "Maintain", icon: "scale-outline" },
  { key: "gain", label: "Gain Weight", icon: "trending-up-outline" },
];

export default function SignupScreen(): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<GoalType>("maintain");

  const previewCals = calcDailyCalories({
    gender,
    weightKg: parseFloat(weight) || 60,
    heightCm: parseFloat(height) || 165,
    age: dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 25,
    activity,
    goal,
  });

  const handleNext = (): void => {
    if (step === 0) {
      if (!name || !email || !password) {
        Alert.alert("💕 Oops!", "Please fill in all fields");
        return;
      }
      if (password.length < 6) {
        Alert.alert("💕 Oops!", "Password must be at least 6 characters");
        return;
      }
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    handleSignup();
  };

  const handleSignup = async (): Promise<void> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        name,
        gender,
        height_cm: parseFloat(height) || null,
        weight_kg: parseFloat(weight) || null,
        activity_level: activity,
        goal,
        daily_calorie_goal: previewCals,
        daily_water_goal_ml: 2500,
      });
    }
    setLoading(false);
  };

  const renderGenderIcon = (genderType: Gender) => {
    switch (genderType) {
      case "female":
        return "female-outline";
      case "male":
        return "male-outline";
      case "other":
        return "person-outline";
    }
  };

  // Inline input with icon — fixes placeholder overlap
  const IconInput = ({
    label,
    icon,
    placeholder,
    value,
    onChangeText,
    keyboardType = "default",
    isPassword = false,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    keyboardType?: any;
    isPassword?: boolean;
  }) => (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.inputText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          secureTextEntry={isPassword && !showPassword}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() =>
                  step > 0 ? setStep(step - 1) : router.push("/auth/login")
                }
                style={styles.backButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={COLORS.textMid}
                />
                <Text style={styles.backText}>
                  {step > 0 ? "Back" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress — FIX: inactive dots now show colored number text */}
            <View style={styles.progressRow}>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.progressItem}>
                  <View
                    style={[
                      styles.progressDot,
                      i <= step && styles.progressDotActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressNum,
                        i <= step && styles.progressNumActive,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.progressLabel,
                      i <= step && styles.progressLabelActive,
                    ]}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </View>

            {/* Step 0 */}
            {step === 0 && (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="person-add-outline"
                    size={40}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.stepTitle}>Create Your Account</Text>
                <Text style={styles.stepSubtitle}>
                  Let's get started on your wellness journey!
                </Text>
                <View style={styles.form}>
                  <IconInput
                    label="Your Name"
                    icon="person-outline"
                    placeholder="What should we call you?"
                    value={name}
                    onChangeText={setName}
                  />
                  <IconInput
                    label="Email"
                    icon="mail-outline"
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                  />
                  <IconInput
                    label="Password"
                    icon="lock-closed-outline"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChangeText={setPassword}
                    isPassword
                  />
                </View>
              </View>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="heart-circle-outline"
                    size={40}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.stepTitle}>Tell Us About You</Text>
                <Text style={styles.stepSubtitle}>
                  Helps us calculate your personal health goals
                </Text>
                <View style={styles.form}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.chipRow}>
                    {[
                      { k: "female" as Gender, l: "Female" },
                      { k: "male" as Gender, l: "Male" },
                      { k: "other" as Gender, l: "Other" },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.k}
                        style={[
                          styles.chip,
                          gender === g.k && styles.chipActive,
                        ]}
                        onPress={() => setGender(g.k)}
                      >
                        <Ionicons
                          name={renderGenderIcon(g.k)}
                          size={24}
                          color={
                            gender === g.k ? COLORS.primary : COLORS.textLight
                          }
                        />
                        <Text
                          style={[
                            styles.chipLabel,
                            gender === g.k && styles.chipLabelActive,
                          ]}
                        >
                          {g.l}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <IconInput
                    label="Date of Birth"
                    icon="calendar-outline"
                    placeholder="YYYY-MM-DD"
                    value={dob}
                    onChangeText={setDob}
                  />
                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>
                      <IconInput
                        label="Height (cm)"
                        icon="resize-outline"
                        placeholder="165"
                        value={height}
                        onChangeText={setHeight}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <IconInput
                        label="Weight (kg)"
                        icon="fitness-outline"
                        placeholder="60"
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="trophy-outline"
                    size={40}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.stepTitle}>Your Goals</Text>
                <Text style={styles.stepSubtitle}>
                  We'll personalize your daily calorie target
                </Text>
                <View style={styles.form}>
                  <Text style={styles.label}>Activity Level</Text>
                  <View style={styles.chipRowWrap}>
                    {ACTIVITY_LEVELS.map((a) => (
                      <TouchableOpacity
                        key={a.key}
                        style={[
                          styles.chipSmall,
                          activity === a.key && styles.chipActive,
                        ]}
                        onPress={() => setActivity(a.key)}
                      >
                        <Ionicons
                          name={a.icon}
                          size={20}
                          color={
                            activity === a.key
                              ? COLORS.primary
                              : COLORS.textLight
                          }
                        />
                        <Text
                          style={[
                            styles.chipLabelSm,
                            activity === a.key && styles.chipLabelActive,
                          ]}
                        >
                          {a.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.label, { marginTop: 16 }]}>
                    Your Goal
                  </Text>
                  <View style={styles.chipRow}>
                    {GOALS.map((g) => (
                      <TouchableOpacity
                        key={g.key}
                        style={[
                          styles.chip,
                          goal === g.key && styles.chipActive,
                        ]}
                        onPress={() => setGoal(g.key)}
                      >
                        <Ionicons
                          name={g.icon}
                          size={24}
                          color={
                            goal === g.key ? COLORS.primary : COLORS.textLight
                          }
                        />
                        <Text
                          style={[
                            styles.chipLabel,
                            goal === g.key && styles.chipLabelActive,
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.previewCard}>
                    <Ionicons
                      name="flame-outline"
                      size={32}
                      color={COLORS.primary}
                    />
                    <Text style={styles.previewLabel}>
                      Estimated daily goal
                    </Text>
                    <Text style={styles.previewCal}>{previewCals} kcal</Text>
                    <Text style={styles.previewSub}>
                      Based on your profile & goals
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <StyledButton
              label={step < 2 ? "Continue" : "Let's Bloom"}
              onPress={handleNext}
              loading={loading}
              icon={
                <Ionicons
                  name={step < 2 ? "arrow-forward-outline" : "flower-outline"}
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
              }
              iconPosition="right"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 12, paddingBottom: 8 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15, color: COLORS.textMid, fontWeight: "500" },

  // FIX: progress dots — inactive shows dark number, active shows white number
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 28,
    marginTop: 8,
  },
  progressItem: { alignItems: "center", gap: 6 },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  progressNum: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMid, // FIX: dark color when inactive so number is visible
  },
  progressNumActive: {
    color: "#ffffff", // white when active
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textLight, // FIX: unified label style
  },
  progressLabelActive: { color: COLORS.primary },

  stepContent: { alignItems: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textMid,
    textAlign: "center",
    marginBottom: 28,
  },
  form: { width: "100%", gap: 14, marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    marginLeft: 4,
  },
  row2: { flexDirection: "row", gap: 12 },

  // FIX: inline icon input — icon + text in same row, no overlap
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
  inputIcon: {
    // no absolute positioning — sits inline
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
  },
  eyeBtn: { padding: 2 },

  chipRow: { flexDirection: "row", gap: 10 },
  chipRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    gap: 4,
    ...SHADOW.card,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipSmall: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...SHADOW.card,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryPale,
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textMid },
  chipLabelSm: { fontSize: 12, fontWeight: "600", color: COLORS.textMid },
  chipLabelActive: { color: COLORS.primary },
  previewCard: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  previewLabel: { fontSize: 13, color: COLORS.textMid, marginBottom: 4 },
  previewCal: { fontSize: 40, fontWeight: "800", color: COLORS.primary },
  previewSub: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});
