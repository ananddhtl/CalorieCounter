import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Reminder } from "../constants/types";
import { NotificationService } from "./notificationService";
import { supabase } from "./useSupabase";

const BACKGROUND_TASK_NAME = "reminder-background-task";

// Only define task if we can actually use it
let taskDefined = false;

try {
  // Try to define the background task
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
      console.log(
        "Background task executed at:",
        new Date().toLocaleTimeString(),
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user found, skipping background task");
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;

      console.log(`Checking reminders for: ${currentTime} on ${today}`);

      const { data: reminders, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching reminders:", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

      if (!reminders || reminders.length === 0) {
        console.log("No active reminders found");
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      console.log(`Found ${reminders.length} active reminders`);

      const todayReminders = (reminders as Reminder[]).filter((reminder) => {
        const dayOfWeek = now.getDay();
        const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;

        const isDayActive = reminder.days_of_week?.includes(isoDay) || false;

        const reminderHour = parseInt(reminder.reminder_time.split(":")[0]);
        const reminderMinute = parseInt(reminder.reminder_time.split(":")[1]);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const timeDiff = Math.abs(
          currentHour * 60 +
            currentMinute -
            (reminderHour * 60 + reminderMinute),
        );

        const isTimeMatch = timeDiff <= 2;

        if (isDayActive && isTimeMatch) {
          console.log(
            `Match found: ${reminder.title} at ${reminder.reminder_time}`,
          );
        }

        return isDayActive && isTimeMatch;
      });

      console.log(`${todayReminders.length} reminders due now`);

      for (const reminder of todayReminders) {
        const { data: existingLog, error: logError } = await supabase
          .from("reminder_logs")
          .select("id")
          .eq("reminder_id", reminder.id)
          .eq("log_date", today)
          .eq("status", "taken")
          .single();

        if (logError && logError.code !== "PGRST116") {
          console.error("Error checking existing log:", logError);
          continue;
        }

        if (!existingLog) {
          await NotificationService.scheduleLocalNotification(
            reminder.title,
            reminder.dosage || `Time to take your ${reminder.title}`,
            2,
            reminder.id,
          );

          try {
            await supabase.from("notification_logs").insert({
              reminder_id: reminder.id,
              user_id: user.id,
              status: "sent",
            });
          } catch (insertError) {
            console.error("Error logging notification:", insertError);
          }

          console.log(`Notification sent for: ${reminder.title}`);
        } else {
          console.log(`${reminder.title} already taken today`);
        }
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error("Error in background task:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  taskDefined = true;
  console.log("✅ Background task definition successful");
} catch (error) {
  console.warn("⚠️  Background task definition skipped (Expo Go):", error);
  taskDefined = false;
}

export class TaskService {
  static isTaskRegistered = false;

  static async registerBackgroundTask(): Promise<void> {
    try {
      // First check if task was even defined
      if (!taskDefined) {
        console.warn("⚠️  Background task not defined (normal in Expo Go)");
        console.log("📱 Local notifications will still work!");
        return;
      }

      // Check if BackgroundFetch has the method
      if (!BackgroundFetch.isAvailableAsync) {
        console.warn("⚠️  BackgroundFetch.isAvailableAsync not available");
        console.log("📱 Local notifications will still work!");
        return;
      }

      // Now try to check if available
      const isAvailable = await BackgroundFetch.isAvailableAsync();

      if (!isAvailable) {
        console.warn("⚠️  Background Fetch not available (normal in Expo Go)");
        console.log("📱 Local notifications will still work!");
        return;
      }

      // Check if registerTaskAsync exists
      if (!BackgroundFetch.registerTaskAsync) {
        console.warn("⚠️  BackgroundFetch.registerTaskAsync not available");
        console.log("📱 Local notifications will still work!");
        return;
      }

      // Register the task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.isTaskRegistered = true;
      console.log("✅ Background task registered successfully");
    } catch (error) {
      console.warn("⚠️  Background task registration not available");
      console.log("📱 Local notifications will still work perfectly!");
      console.log("💡 Background tasks need development build or APK");
      // Don't throw error - this is expected in Expo Go
    }
  }

  static async unregisterBackgroundTask(): Promise<void> {
    try {
      if (!BackgroundFetch.unregisterTaskAsync) {
        return;
      }

      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
      this.isTaskRegistered = false;
      console.log("Background task unregistered");
    } catch (error) {
      console.error("Error unregistering background task:", error);
    }
  }

  static async checkStatus(): Promise<void> {
    try {
      if (!BackgroundFetch.getStatusAsync) {
        console.log("ℹ️  BackgroundFetch not available (Expo Go limitation)");
        return;
      }

      const status = await BackgroundFetch.getStatusAsync();
      console.log("Background Fetch Status:", status);

      if (status === 1) {
        console.warn("⚠️  Background Fetch is DENIED");
      } else if (status === 2) {
        console.log("✅ Background Fetch is ALLOWED");
      } else if (status === 3) {
        console.log("ℹ️  Background Fetch: Unavailable (Expo Go limitation)");
      }
    } catch (error) {
      console.warn(
        "Background fetch status check skipped (expected in Expo Go)",
      );
    }
  }
}
