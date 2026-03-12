import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import {
  ActivityLevel,
  GoalType,
  Profile,
  WeightLog,
} from "../../constants/types";
import { useSession } from "../../hooks/useSession";
import { supabase } from "../../hooks/useSupabase";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export default function ProfileScreen(): React.JSX.Element {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [editModal, setEditModal] = useState<boolean>(false);
  const [weightModal, setWeightModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<GoalType>("maintain");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [waterGoal, setWaterGoal] = useState("");
  const [newWeight, setNewWeight] = useState("");

  const fetchData = useCallback(async (): Promise<void> => {
    const uid = session?.user?.id;
    if (!uid) return;
    const [{ data: prof }, { data: wLogs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).single(),
      supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", uid)
        .order("log_date", { ascending: false })
        .limit(10),
    ]);
    const p = prof as Profile;
    setProfile(p);
    setWeightLogs((wLogs as WeightLog[]) || []);
    if (p) {
      setName(p.name || "");
      setHeight(String(p.height_cm || ""));
      setWeight(String(p.weight_kg || ""));
      setGoal(p.goal || "maintain");
      setActivity(p.activity_level || "moderate");
      setCalorieGoal(String(p.daily_calorie_goal || 2000));
      setWaterGoal(String(p.daily_water_goal_ml || 2500));
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const bmi =
    profile?.height_cm && profile?.weight_kg
      ? Number(
          (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1),
        )
      : null;

  const bmiCategory = bmi
    ? bmi < 18.5
      ? {
          label: "Underweight",
          color: COLORS.mint,
          icon: "trending-down" as const,
        }
      : bmi < 25
        ? {
            label: "Healthy Weight",
            color: COLORS.green,
            icon: "checkmark-circle" as const,
          }
        : bmi < 30
          ? {
              label: "Overweight",
              color: COLORS.peach,
              icon: "warning" as const,
            }
          : {
              label: "Obese",
              color: COLORS.danger,
              icon: "alert-circle" as const,
            }
    : null;

  const tdee = (() => {
    if (!profile?.height_cm || !profile?.weight_kg) return null;
    const age = profile.date_of_birth
      ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
      : 25;
    const bmr =
      profile.gender === "male"
        ? 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age + 5
        : 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age - 161;
    return Math.round(
      bmr * ACTIVITY_MULTIPLIERS[profile.activity_level || "moderate"],
    );
  })();

  const idealWeight = profile?.height_cm
    ? {
        min: Math.round(18.5 * Math.pow(profile.height_cm / 100, 2)),
        max: Math.round(24.9 * Math.pow(profile.height_cm / 100, 2)),
      }
    : null;

  const saveProfile = async (): Promise<void> => {
    setSaving(true);
    const uid = session?.user?.id;
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        height_cm: parseFloat(height) || null,
        weight_kg: parseFloat(weight) || null,
        goal,
        activity_level: activity,
        daily_calorie_goal: parseInt(calorieGoal) || 2000,
        daily_water_goal_ml: parseInt(waterGoal) || 2500,
      })
      .eq("id", uid);
    if (!error) {
      await fetchData();
      setEditModal(false);
    } else Alert.alert("Error", error.message);
    setSaving(false);
  };

  const logWeight = async (): Promise<void> => {
    const w = parseFloat(newWeight);
    if (!w) {
      Alert.alert("Required", "Enter a valid weight");
      return;
    }
    const uid = session?.user?.id;
    if (!uid) return;
    await Promise.all([
      supabase.from("weight_logs").insert({
        user_id: uid,
        weight_kg: w,
        log_date: new Date().toISOString().split("T")[0],
      }),
      supabase.from("profiles").update({ weight_kg: w }).eq("id", uid),
    ]);
    setNewWeight("");
    setWeightModal(false);
    fetchData();
  };

  const handleSignOut = (): void => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  return (
    <LinearGradient colors={["#FFF0F5", "#FFF8FB"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <LinearGradient
            colors={[COLORS.primary, "#FF8FAB"]}
            style={styles.profileHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={44} color={COLORS.white} />
            </View>
            <Text style={styles.profileName}>
              {profile?.name || "My Profile"}
            </Text>
            <Text style={styles.profileEmail}>{session?.user?.email}</Text>
            <View style={styles.badges}>
              {profile?.goal && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name={
                      profile.goal === "lose"
                        ? "weight"
                        : profile.goal === "gain"
                          ? "weight"
                          : "scale-balance"
                    }
                    size={12}
                    color={COLORS.white}
                  />
                  <Text style={styles.badgeText}>
                    {profile.goal === "lose"
                      ? "Lose Weight"
                      : profile.goal === "gain"
                        ? "Gain Weight"
                        : "Maintain"}
                  </Text>
                </View>
              )}
              {profile?.activity_level && (
                <View style={styles.badge}>
                  <MaterialCommunityIcons
                    name="run"
                    size={12}
                    color={COLORS.white}
                  />
                  <Text style={styles.badgeText}>{profile.activity_level}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditModal(true)}
            >
              <Ionicons name="pencil" size={16} color={COLORS.white} />
              <Text style={styles.editBtnTxt}>Edit Profile</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="calculator"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>BMI & Body Stats</Text>
            </View>
            <View style={styles.bmiRow}>
              <View style={styles.bmiMain}>
                <Text style={styles.bmiValue}>{bmi ?? "--"}</Text>
                <Text style={styles.bmiLabel}>BMI</Text>
                {bmiCategory && (
                  <View
                    style={[
                      styles.bmiCatBadge,
                      { backgroundColor: bmiCategory.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={bmiCategory.icon}
                      size={12}
                      color={bmiCategory.color}
                    />
                    <Text
                      style={[styles.bmiCatText, { color: bmiCategory.color }]}
                    >
                      {bmiCategory.label}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.bmiStats}>
                <StatRow
                  icon="straighten"
                  iconFamily="MaterialIcons"
                  label="Height"
                  value={profile?.height_cm ? `${profile.height_cm} cm` : "--"}
                />
                <StatRow
                  icon="scale-bathroom"
                  iconFamily="MaterialCommunityIcons"
                  label="Weight"
                  value={profile?.weight_kg ? `${profile.weight_kg} kg` : "--"}
                />
                {idealWeight && (
                  <StatRow
                    icon="target"
                    iconFamily="MaterialCommunityIcons"
                    label="Ideal Weight"
                    value={`${idealWeight.min}–${idealWeight.max} kg`}
                  />
                )}
              </View>
            </View>
            {bmi && (
              <View style={styles.bmiScaleContainer}>
                <LinearGradient
                  colors={[
                    COLORS.mint,
                    COLORS.green,
                    COLORS.peach,
                    COLORS.danger,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.bmiScaleBar}
                />
                <View
                  style={[
                    styles.bmiPointer,
                    {
                      left: `${Math.min(Math.max(((bmi - 15) / 25) * 100, 0), 100)}%` as `${number}%`,
                    },
                  ]}
                />
                <View style={styles.bmiScaleLabels}>
                  {["15", "18.5", "25", "30", "40"].map((l) => (
                    <Text key={l} style={styles.bmiScaleLbl}>
                      {l}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>

          {tdee && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="fire"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.sectionTitle}>Daily Calorie Needs</Text>
              </View>
              <View style={styles.tdeeRow}>
                <View style={styles.tdeeItem}>
                  <MaterialCommunityIcons
                    name="sofa"
                    size={22}
                    color={COLORS.textMid}
                  />
                  <Text style={styles.tdeeVal}>
                    {Math.round((tdee / 1.55) * 1.2)}
                  </Text>
                  <Text style={styles.tdeeLbl}>Sedentary</Text>
                </View>
                <View style={[styles.tdeeItem, styles.tdeeItemActive]}>
                  <MaterialCommunityIcons
                    name="target"
                    size={22}
                    color={COLORS.primary}
                  />
                  <Text style={[styles.tdeeVal, { color: COLORS.primary }]}>
                    {profile?.daily_calorie_goal ?? tdee}
                  </Text>
                  <Text style={[styles.tdeeLbl, { color: COLORS.primary }]}>
                    Your Goal
                  </Text>
                </View>
                <View style={styles.tdeeItem}>
                  <MaterialCommunityIcons
                    name="weight-lifter"
                    size={22}
                    color={COLORS.textMid}
                  />
                  <Text style={styles.tdeeVal}>
                    {Math.round((tdee / 1.55) * 1.9)}
                  </Text>
                  <Text style={styles.tdeeLbl}>Very Active</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="history"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.sectionTitle}>Weight History</Text>
              </View>
              <TouchableOpacity
                style={styles.logWeightBtn}
                onPress={() => setWeightModal(true)}
              >
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.logWeightTxt}>Log</Text>
              </TouchableOpacity>
            </View>
            {weightLogs.length === 0 && (
              <Text style={styles.emptyText}>
                No weight logs yet. Start tracking!
              </Text>
            )}
            {weightLogs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.weightRow}>
                <MaterialCommunityIcons
                  name="scale-bathroom"
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.weightVal}>{log.weight_kg} kg</Text>
                <Text style={styles.weightDate}>{log.log_date}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="flag-checkered"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Daily Goals</Text>
            </View>
            <View style={styles.goalsRow}>
              <View style={styles.goalItem}>
                <MaterialCommunityIcons
                  name="fire"
                  size={28}
                  color={COLORS.primary}
                />
                <Text style={styles.goalVal}>
                  {profile?.daily_calorie_goal ?? 2000}
                </Text>
                <Text style={styles.goalLbl}>kcal/day</Text>
              </View>
              <View style={styles.goalItem}>
                <MaterialCommunityIcons
                  name="water"
                  size={28}
                  color={COLORS.primary}
                />
                <Text style={styles.goalVal}>
                  {((profile?.daily_water_goal_ml ?? 2500) / 1000).toFixed(1)}L
                </Text>
                <Text style={styles.goalLbl}>water/day</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <MaterialCommunityIcons
              name="logout"
              size={18}
              color={COLORS.danger}
            />
            <Text style={styles.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>
          <View style={{ height: 90 }} />
        </ScrollView>

        <Modal
          visible={editModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <LinearGradient colors={["#FFF0F5", "#FFFFFF"]} style={{ flex: 1 }}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons
                      name="person-outline"
                      size={24}
                      color={COLORS.primary}
                    />
                    <Text style={styles.modalTitle}>Edit Profile</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditModal(false)}>
                    <Ionicons name="close" size={24} color={COLORS.textMid} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  <EditInput
                    icon="person-outline"
                    label="Name"
                    value={name}
                    onChangeText={setName}
                  />
                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>
                      <EditInput
                        icon="straighten"
                        iconFamily="MaterialIcons"
                        label="Height (cm)"
                        value={height}
                        onChangeText={setHeight}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <EditInput
                        icon="scale-bathroom"
                        iconFamily="MaterialCommunityIcons"
                        label="Weight (kg)"
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <EditInput
                    icon="fire"
                    iconFamily="MaterialCommunityIcons"
                    label="Daily Calorie Goal (kcal)"
                    value={calorieGoal}
                    onChangeText={setCalorieGoal}
                    keyboardType="numeric"
                  />
                  <EditInput
                    icon="water"
                    iconFamily="MaterialCommunityIcons"
                    label="Daily Water Goal (ml)"
                    value={waterGoal}
                    onChangeText={setWaterGoal}
                    keyboardType="numeric"
                  />
                  <Text style={styles.formLabel}>Goal</Text>
                  <View style={styles.chipRow}>
                    {[
                      {
                        k: "lose" as GoalType,
                        l: "Lose",
                        icon: "weight" as const,
                      },
                      {
                        k: "maintain" as GoalType,
                        l: "Maintain",
                        icon: "scale-balance" as const,
                      },
                      {
                        k: "gain" as GoalType,
                        l: "Gain",
                        icon: "weight" as const,
                      },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.k}
                        style={[styles.chip, goal === g.k && styles.chipActive]}
                        onPress={() => setGoal(g.k)}
                      >
                        <MaterialCommunityIcons
                          name={g.icon}
                          size={14}
                          color={goal === g.k ? COLORS.primary : COLORS.textMid}
                        />
                        <Text
                          style={[
                            styles.chipTxt,
                            goal === g.k && styles.chipTxtActive,
                          ]}
                        >
                          {g.l}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveProfile}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, "#FF8FAB"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveBtnGrad}
                    >
                      {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.saveBtnTxt}>Save Changes</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </SafeAreaView>
            </LinearGradient>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={weightModal}
          animationType="slide"
          presentationStyle="formSheet"
        >
          <LinearGradient colors={["#FFF0F5", "#FFFFFF"]} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={24}
                    color={COLORS.primary}
                  />
                  <Text style={styles.modalTitle}>Log Weight</Text>
                </View>
                <TouchableOpacity onPress={() => setWeightModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textMid} />
                </TouchableOpacity>
              </View>
              <View style={{ alignItems: "center", paddingTop: 40, gap: 20 }}>
                <MaterialCommunityIcons
                  name="scale-bathroom"
                  size={56}
                  color={COLORS.primary}
                />
                <View style={[styles.formInputRow, { width: "100%" }]}>
                  <TextInput
                    style={[
                      styles.formInputTxt,
                      { flex: 1, fontSize: 22, textAlign: "center" },
                    ]}
                    placeholder="e.g. 58.5"
                    placeholderTextColor={COLORS.textLight}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      color: COLORS.textMid,
                      fontWeight: "600",
                    }}
                  >
                    kg
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, { width: "100%" }]}
                  onPress={logWeight}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[COLORS.primary, "#FF8FAB"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveBtnGrad}
                  >
                    <Text style={styles.saveBtnTxt}>Log Weight</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatRow({
  icon,
  iconFamily = "MaterialCommunityIcons",
  label,
  value,
}: {
  icon: string;
  iconFamily?: "Ionicons" | "MaterialCommunityIcons" | "MaterialIcons";
  label: string;
  value: string;
}): React.JSX.Element {
  const IconComponent =
    iconFamily === "Ionicons"
      ? Ionicons
      : iconFamily === "MaterialIcons"
        ? require("@expo/vector-icons").MaterialIcons
        : MaterialCommunityIcons;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 4,
      }}
    >
      <IconComponent name={icon} size={16} color={COLORS.primary} />
      <Text style={{ fontSize: 12, color: COLORS.textLight, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.textDark }}>
        {value}
      </Text>
    </View>
  );
}

interface EditInputProps extends TextInputProps {
  label: string;
  icon?: string;
  iconFamily?: "Ionicons" | "MaterialCommunityIcons" | "MaterialIcons";
}
function EditInput({
  label,
  icon,
  iconFamily = "MaterialCommunityIcons",
  ...props
}: EditInputProps): React.JSX.Element {
  const IconComponent =
    iconFamily === "Ionicons"
      ? Ionicons
      : iconFamily === "MaterialIcons"
        ? require("@expo/vector-icons").MaterialIcons
        : MaterialCommunityIcons;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.formInputRow}>
        {icon && (
          <IconComponent
            name={icon}
            size={18}
            color={COLORS.textLight}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          style={[styles.formInputTxt, { flex: 1 }]}
          placeholderTextColor={COLORS.textLight}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  profileHeader: {
    borderRadius: RADIUS.xl,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
    ...SHADOW.soft,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  profileName: { fontSize: 22, fontWeight: "800", color: COLORS.white },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  badges: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: { fontSize: 12, color: COLORS.white, fontWeight: "600" },
  editBtn: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editBtnTxt: { fontSize: 14, color: COLORS.white, fontWeight: "600" },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  bmiRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  bmiMain: { alignItems: "center", gap: 4, minWidth: 100 },
  bmiValue: { fontSize: 48, fontWeight: "800", color: COLORS.textDark },
  bmiLabel: { fontSize: 13, color: COLORS.textLight },
  bmiCatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bmiCatText: { fontSize: 12, fontWeight: "700" },
  bmiStats: { flex: 1, justifyContent: "center", gap: 4 },
  bmiScaleContainer: { gap: 4, position: "relative" },
  bmiScaleBar: { height: 10, borderRadius: 5 },
  bmiPointer: {
    position: "absolute",
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.textDark,
    marginLeft: -8,
  },
  bmiScaleLabels: { flexDirection: "row", justifyContent: "space-between" },
  bmiScaleLbl: { fontSize: 10, color: COLORS.textLight },
  tdeeRow: { flexDirection: "row", justifyContent: "space-around" },
  tdeeItem: {
    alignItems: "center",
    gap: 4,
    padding: 12,
    borderRadius: RADIUS.md,
    flex: 1,
  },
  tdeeItemActive: { backgroundColor: COLORS.primaryPale },
  tdeeVal: { fontSize: 20, fontWeight: "800", color: COLORS.textDark },
  tdeeLbl: { fontSize: 11, color: COLORS.textLight },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logWeightBtn: {
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logWeightTxt: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    gap: 10,
  },
  weightVal: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    flex: 1,
  },
  weightDate: { fontSize: 12, color: COLORS.textLight },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: 12,
  },
  goalsRow: { flexDirection: "row", justifyContent: "space-around" },
  goalItem: { alignItems: "center", gap: 4 },
  goalVal: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  goalLbl: { fontSize: 12, color: COLORS.textLight },
  signOutBtn: {
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    ...SHADOW.card,
  },
  signOutTxt: { fontSize: 15, fontWeight: "700", color: COLORS.danger },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  row2: { flexDirection: "row", gap: 12 },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  formInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...SHADOW.card,
  },
  formInputTxt: { fontSize: 15, color: COLORS.textDark },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    ...SHADOW.card,
  },
  chipActive: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  chipTxt: { fontSize: 13, fontWeight: "600", color: COLORS.textMid },
  chipTxtActive: { color: COLORS.primary },
  saveBtn: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginTop: 8,
    ...SHADOW.soft,
  },
  saveBtnGrad: { paddingVertical: 16, alignItems: "center" },
  saveBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
