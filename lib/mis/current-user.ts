import { createClient } from "@/lib/supabase/server";

export type StaffAccountSummary = {
  account_id: string;
  sme_id: string;
  full_name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  is_active: boolean;
};

export async function getCurrentStaffAccount(): Promise<StaffAccountSummary | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("staff_account")
    .select("account_id, sme_id, full_name, role, is_active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as StaffAccountSummary | null) ?? null;
}
