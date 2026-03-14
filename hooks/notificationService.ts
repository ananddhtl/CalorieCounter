import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "./useSupabase";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log("Notification received:", notification);
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Check if we're in Expo Go
const isExpoGo = !Constants.expoConfig?.plugins?.find((p) =>
  typeof p === "string"
    ? p.includes("expo-dev-client")
    : p[0]?.includes("expo-dev-client"),
);

export class NotificationService {
  static async initialize(): Promise<void> {
    // Skip if in Expo Go
    if (isExpoGo) {
      console.warn("⚠️  Expo Go detected - notifications disabled");
      console.log("📱 Use development build for full notifications");
      return;
    }

    if (!Device.isDevice) {
      console.warn("Notifications only work on physical devices");
      return;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Failed to get notification permissions");
        return;
      }

      const token = await this.getFCMToken();
      if (token) {
        await this.saveFCMToken(token);
      }

      this.setupListeners();
    } catch (error) {
      console.error("Error initializing notifications:", error);
    }
  }

  static async getFCMToken(): Promise<string | null> {
    try {
      if (__DEV__) {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (projectId) {
          const token = (
            await Notifications.getDevicePushTokenAsync({
              projectId,
            })
          ).data;
          console.log("Expo Push Token:", token);
          return token;
        }
      }

      const token = (await Notifications.getDevicePushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error("Error getting FCM token:", error);
      return null;
    }
  }

  static async saveFCMToken(token: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await AsyncStorage.setItem("@notification_token", token);

      const { error } = await supabase.from("notification_tokens").upsert(
        {
          user_id: user.id,
          token,
          device_type: Device.osName,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,device_type",
        },
      );

      if (error) {
        console.error("Error saving token to Supabase:", error);
      } else {
        console.log("FCM token saved successfully");
      }
    } catch (error) {
      console.error("Error saving FCM token:", error);
    }
  }

  static setupListeners(): void {
    this.foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Foreground notification:", notification);
      },
    );

    this.responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data;
          console.log("Notification tapped:", data);

          if (data.reminderId) {
            await this.handleReminderNotificationTap(data.reminderId as string);
          }
        },
      );
  }

  static foregroundSubscription: Notifications.Subscription | null = null;
  static responseSubscription: Notifications.Subscription | null = null;

  static async handleReminderNotificationTap(
    reminderId: string,
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const TODAY = new Date().toISOString().split("T")[0];

      const { data: existingLog } = await supabase
        .from("reminder_logs")
        .select("id")
        .eq("reminder_id", reminderId)
        .eq("log_date", TODAY)
        .single();

      if (!existingLog) {
        await supabase.from("reminder_logs").insert({
          reminder_id: reminderId,
          user_id: user.id,
          status: "taken",
          log_date: TODAY,
        });
      }

      console.log("Reminder marked as taken from notification");
    } catch (error) {
      console.error("Error handling notification tap:", error);
    }
  }

  static cleanup(): void {
    this.foregroundSubscription?.remove();
    this.responseSubscription?.remove();
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    delay: number,
    reminderId?: string,
  ): Promise<void> {
    try {
      // Skip if in Expo Go
      if (isExpoGo) {
        console.warn("⚠️  Notifications disabled in Expo Go");
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          badge: 1,
          data: reminderId ? { reminderId } : {},
        },
        trigger: {
          seconds: delay,
        },
      });
      console.log(`Notification scheduled: ${title} in ${delay}s`);
    } catch (error) {
      console.error("Error scheduling local notification:", error);
    }
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error canceling all notifications:", error);
    }
  }
}
