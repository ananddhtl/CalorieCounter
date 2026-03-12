import { useCallback, useEffect, useState } from "react";
import { Profile } from "../constants/types";
import { supabase } from "./useSupabase";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
    if (!userId) return;
    await supabase.from("profiles").update(updates).eq("id", userId);
    fetchProfile();
  };

  return { profile, loading, fetchProfile, updateProfile };
}
