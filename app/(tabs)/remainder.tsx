import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import {
  Reminder,
  ReminderLog,
  ReminderType,
  ReminderTypeOption,
} from "../../constants/types";
import { NotificationService } from "../../hooks/notificationService";
import { TaskService } from "../../hooks/taskService";
import { supabase } from "../../hooks/useSupabase";
const TODAY = new Date().toISOString().split("T")[0];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const REMINDER_TYPES: ReminderTypeOption[] = [
  {
    key: "medicine",
    label: "Medicine",
    icon: "medical",
    color: COLORS.primary,
  },
  { key: "water", label: "Water", icon: "water", color: COLORS.mint },
  { key: "meal", label: "Meal", icon: "restaurant", color: COLORS.green },
  { key: "exercise", label: "Exercise", icon: "fitness", color: COLORS.accent },
  { key: "custom", label: "Custom", icon: "create", color: COLORS.peach },
];

export default function RemindersScreen(): React.JSX.Element {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(true);

  const [type, setType] = useState<ReminderType>("medicine");
  const [title, setTitle] = useState("");
  const [dosage, setDosage] = useState("");
  const [icon, setIcon] = useState("medical");
  const [color, setColor] = useState(COLORS.primary);
  const [time, setTime] = useState("08:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await NotificationService.initialize();
        await TaskService.registerBackgroundTask();
        console.log("Notifications initialized in RemindersScreen");
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    return () => {
      NotificationService.cleanup();
    };
  }, []);

  const fetchData = useCallback(async (): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: rems }, { data: logs }] = await Promise.all([
      supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
        .order("reminder_time"),
      supabase
        .from("reminder_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", TODAY),
    ]);
    setReminders((rems as Reminder[]) || []);
    setReminderLogs((logs as ReminderLog[]) || []);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = (): void => {
    setType("medicine");
    setTitle("");
    setDosage("");
    setIcon("medical");
    setColor(COLORS.primary);
    setTime("08:00");
    setDays([1, 2, 3, 4, 5, 6, 7]);
  };

  const scheduleReminderNotification = (reminder: Reminder): void => {
    try {
      const now = new Date();
      const [hours, minutes] = reminder.reminder_time.split(":").map(Number);

      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0);

      // If time has passed today, schedule for tomorrow
      if (reminderDate < now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }

      const delayMs = reminderDate.getTime() - now.getTime();
      const delaySecs = Math.ceil(delayMs / 1000);

      if (delaySecs > 0) {
        NotificationService.scheduleLocalNotification(
          reminder.title,
          reminder.dosage || `Time to take your ${reminder.title}`,
          delaySecs,
          reminder.id,
        );

        console.log(
          `Notification scheduled for ${reminder.title} in ${delaySecs} seconds`,
        );
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  const saveReminder = async (): Promise<void> => {
    if (!title || !time) {
      Alert.alert("Oops!", "Enter a title and time");
      return;
    }
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { error, data: reminderData } = await supabase
        .from("reminders")
        .insert({
          user_id: user.id,
          type,
          title,
          dosage,
          icon,
          color,
          reminder_time: time.length === 5 ? time + ":00" : time,
          days_of_week: days,
          is_active: true,
        })
        .select();

      if (!error && reminderData) {
        // Schedule notification for today if reminder is due today
        if (notificationEnabled) {
          scheduleReminderNotification(reminderData[0]);
        }

        await fetchData();
        setModalVisible(false);
        resetForm();
        Alert.alert("Success", `Reminder "${title}" created!`);
      } else {
        Alert.alert("Error", error?.message || "Failed to create reminder");
      }
    } catch (error) {
      console.error("Error saving reminder:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (rem: Reminder): Promise<void> => {
    try {
      const newState = !rem.is_active;
      await supabase
        .from("reminders")
        .update({ is_active: newState })
        .eq("id", rem.id);

      if (!newState) {
        // Cancel notifications if disabling
      } else if (notificationEnabled) {
        // Re-schedule if enabling and notifications are on
        scheduleReminderNotification(rem);
      }

      fetchData();
    } catch (error) {
      console.error("Error toggling reminder:", error);
      Alert.alert("Error", "Failed to update reminder");
    }
  };

  const deleteReminder = (id: string): void => {
    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this reminder?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              // First delete associated logs
              await supabase
                .from("reminder_logs")
                .delete()
                .eq("reminder_id", id);
              // Then delete the reminder
              await supabase.from("reminders").delete().eq("id", id);
              await fetchData();
              Alert.alert("Deleted", "Reminder removed successfully");
            } catch (error) {
              console.error("Error deleting reminder:", error);
              Alert.alert("Error", "Failed to delete reminder");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const markTaken = async (remId: string): Promise<void> => {
    try {
      const already = reminderLogs.find((l) => l.reminder_id === remId);
      if (already) {
        await supabase.from("reminder_logs").delete().eq("id", already.id);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("reminder_logs").insert({
          reminder_id: remId,
          user_id: user.id,
          status: "taken",
          log_date: TODAY,
        });
      }
      fetchData();
    } catch (error) {
      console.error("Error marking reminder as taken:", error);
      Alert.alert("Error", "Failed to update reminder status");
    }
  };

  const toggleDay = (d: number): void => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const takenToday = reminders.filter((r) =>
    reminderLogs.some((l) => l.reminder_id === r.id && l.status === "taken"),
  ).length;

  return (
    <LinearGradient colors={["#FFF0F5", "#FFF8FB"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.heading}>
                <Ionicons
                  name="notifications"
                  size={26}
                  color={COLORS.textDark}
                />{" "}
                Reminders
              </Text>
              <Text style={styles.subheading}>
                Stay on track with your health
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addMainBtn}
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={[COLORS.primary, "#FF8FAB"]}
                style={styles.addMainGrad}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addMainText}>New</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.notificationToggle}>
            <View style={styles.notificationToggleLeft}>
              <Ionicons
                name={
                  notificationEnabled ? "notifications" : "notifications-off"
                }
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.notificationToggleText}>
                {notificationEnabled ? "Notifications On" : "Notifications Off"}
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={setNotificationEnabled}
              trackColor={{
                false: COLORS.surface,
                true: COLORS.primaryLight,
              }}
              thumbColor={
                notificationEnabled ? COLORS.primary : COLORS.textLight
              }
            />
          </View>

          <View style={styles.statsRow}>
            {[
              {
                icon: "list",
                val: reminders.length,
                lbl: "Total",
                bg: COLORS.primaryPale,
              },
              {
                icon: "checkmark-circle",
                val: takenToday,
                lbl: "Taken Today",
                bg: COLORS.greenLight,
              },
              {
                icon: "alarm",
                val: reminders.filter((r) => r.is_active).length,
                lbl: "Active",
                bg: COLORS.peachLight,
              },
            ].map((s, i) => (
              <View
                key={i}
                style={[styles.statCard, { backgroundColor: s.bg }]}
              >
                <Ionicons
                  name={s.icon as any}
                  size={24}
                  color={COLORS.textDark}
                />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
            ))}
          </View>

          {reminders.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off"
                size={56}
                color={COLORS.textLight}
              />
              <Text style={styles.emptyTitle}>No Reminders Yet</Text>
              <Text style={styles.emptySub}>
                Add medicines, vitamins, or wellness reminders
              </Text>
            </View>
          )}

          {REMINDER_TYPES.map((rType) => {
            const typeRems = reminders.filter((r) => r.type === rType.key);
            if (typeRems.length === 0) return null;
            return (
              <View key={rType.key} style={styles.typeSection}>
                <Text style={styles.typeHeader}>
                  <Ionicons
                    name={rType.icon as any}
                    size={16}
                    color={COLORS.textDark}
                  />{" "}
                  {rType.label}
                </Text>
                {typeRems.map((rem) => {
                  const isTaken = reminderLogs.some(
                    (l) => l.reminder_id === rem.id && l.status === "taken",
                  );
                  return (
                    <View
                      key={rem.id}
                      style={[styles.remCard, isTaken && styles.remCardTaken]}
                    >
                      <View
                        style={[
                          styles.remIconBg,
                          { backgroundColor: rem.color + "20" },
                        ]}
                      >
                        <Ionicons
                          name={
                            (rem.icon as keyof typeof Ionicons.glyphMap) ||
                            "help-circle"
                          }
                          size={24}
                          color={rem.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.remTitle,
                            isTaken && styles.remTitleTaken,
                          ]}
                        >
                          {rem.title}
                        </Text>
                        {rem.dosage && (
                          <Text style={styles.remDosage}>{rem.dosage}</Text>
                        )}
                        <Text style={styles.remTime}>
                          <Ionicons
                            name="time"
                            size={12}
                            color={COLORS.textLight}
                          />{" "}
                          {rem.reminder_time?.slice(0, 5)}
                        </Text>
                        <View style={styles.remDays}>
                          {DAYS.map((d, i) => (
                            <View
                              key={i}
                              style={[
                                styles.remDayDot,
                                rem.days_of_week?.includes(i + 1) &&
                                  styles.remDayDotActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.remDayTxt,
                                  rem.days_of_week?.includes(i + 1) &&
                                    styles.remDayTxtActive,
                                ]}
                              >
                                {d[0]}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={styles.remActions}>
                        <Switch
                          value={rem.is_active}
                          onValueChange={() => toggleReminder(rem)}
                          trackColor={{
                            false: COLORS.surface,
                            true: COLORS.primaryLight,
                          }}
                          thumbColor={
                            rem.is_active ? COLORS.primary : COLORS.textLight
                          }
                          style={{
                            transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
                          }}
                        />
                        <TouchableOpacity
                          style={[
                            styles.takenBtn,
                            isTaken && styles.takenBtnActive,
                          ]}
                          onPress={() => markTaken(rem.id)}
                        >
                          <Ionicons
                            name={isTaken ? "checkmark" : "ellipse-outline"}
                            size={16}
                            color={isTaken ? COLORS.white : COLORS.textLight}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => deleteReminder(rem.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={COLORS.error || "#FF4444"}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>

        <Modal
          visible={modalVisible}
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
                  <Text style={styles.modalTitle}>New Reminder</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      resetForm();
                    }}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textMid} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.formLabel}>Type</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                  >
                    {REMINDER_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.typeChip,
                          type === t.key && {
                            backgroundColor: t.color + "20",
                            borderColor: t.color,
                          },
                        ]}
                        onPress={() => {
                          setType(t.key);
                          setIcon(t.icon);
                          setColor(t.color);
                        }}
                      >
                        <Ionicons
                          name={t.icon as any}
                          size={18}
                          color={t.color}
                        />
                        <Text
                          style={[
                            styles.typeChipLabel,
                            type === t.key && { color: t.color },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Name *</Text>
                    <View style={styles.formInput}>
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={COLORS.textLight}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={styles.formInputTxt}
                        placeholder="e.g. Vitamin D, Iron tablet"
                        placeholderTextColor={COLORS.textLight}
                        value={title}
                        onChangeText={setTitle}
                      />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Dosage / Notes</Text>
                    <View style={styles.formInput}>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={COLORS.textLight}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={styles.formInputTxt}
                        placeholder="e.g. 1 tablet after meal"
                        placeholderTextColor={COLORS.textLight}
                        value={dosage}
                        onChangeText={setDosage}
                      />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Time (HH:MM) *</Text>
                    <View style={styles.formInput}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={COLORS.textLight}
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        style={[styles.formInputTxt, { flex: 1 }]}
                        placeholder="08:00"
                        placeholderTextColor={COLORS.textLight}
                        value={time}
                        onChangeText={setTime}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                  </View>
                  <Text style={styles.formLabel}>Repeat Days</Text>
                  <View style={styles.daysRow}>
                    {DAYS.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.dayChip,
                          days.includes(i + 1) && styles.dayChipActive,
                        ]}
                        onPress={() => toggleDay(i + 1)}
                      >
                        <Text
                          style={[
                            styles.dayChipTxt,
                            days.includes(i + 1) && styles.dayChipTxtActive,
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveReminder}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, "#FF8FAB"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.saveBtnGrad}
                    >
                      <Ionicons
                        name="save-outline"
                        size={20}
                        color={COLORS.white}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.saveBtnTxt}>
                        {loading ? "Saving..." : "Save Reminder"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </SafeAreaView>
            </LinearGradient>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginBottom: 16,
  },
  heading: { fontSize: 26, fontWeight: "800", color: COLORS.textDark },
  subheading: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  addMainBtn: { borderRadius: RADIUS.full, overflow: "hidden", ...SHADOW.soft },
  addMainGrad: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addMainText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  notificationToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    ...SHADOW.card,
  },
  notificationToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statVal: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  statLbl: { fontSize: 10, color: COLORS.textMid, textAlign: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: "center" },
  typeSection: { marginBottom: 16 },
  typeHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  remCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...SHADOW.card,
  },
  remCardTaken: { opacity: 0.6 },
  remIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  remTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textDark },
  remTitleTaken: {
    textDecorationLine: "line-through",
    color: COLORS.textLight,
  },
  remDosage: { fontSize: 12, color: COLORS.textMid, marginTop: 2 },
  remTime: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  remDays: { flexDirection: "row", gap: 4, marginTop: 6 },
  remDayDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  remDayDotActive: { backgroundColor: COLORS.primaryLight },
  remDayTxt: { fontSize: 9, fontWeight: "600", color: COLORS.textLight },
  remDayTxtActive: { color: COLORS.white },
  remActions: { alignItems: "center", gap: 8 },
  takenBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  takenBtnActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  deleteBtn: { padding: 4 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.textDark },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
    ...SHADOW.card,
  },
  typeChipLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textMid },
  formGroup: { marginBottom: 12 },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  formInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    ...SHADOW.card,
  },
  formInputTxt: { flex: 1, fontSize: 15, color: COLORS.textDark },
  daysRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
    ...SHADOW.card,
  },
  dayChipActive: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  dayChipTxt: { fontSize: 11, fontWeight: "600", color: COLORS.textLight },
  dayChipTxtActive: { color: COLORS.primary },
  saveBtn: { borderRadius: RADIUS.full, overflow: "hidden", ...SHADOW.soft },
  saveBtnGrad: {
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnTxt: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});
