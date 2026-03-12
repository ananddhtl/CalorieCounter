import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://nwyuwwubtnakntpjflns.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eXV3d3VidG5ha250cGpmbG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODg3MTIsImV4cCI6MjA4ODg2NDcxMn0.msPeHQMdOjPP5tvKitN0lKo4Vr9mQpYLEUjPPFRcwEc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
