import { createClient } from "@/lib/supabase/server";

export type StaffAccountSummary = {
  account_id: string;
  sme_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  name_suffix: string | null;
  full_name: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  is_active: boolean;
};

function formatStaffName(account: {
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  name_suffix: string | null;
}) {
  return [account.first_name, account.middle_name, account.last_name, account.name_suffix]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export async function getCurrentStaffAccount(): Promise<StaffAccountSummary | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return null;

  // auth_user_id is intentionally not readable by the authenticated Data API role.
  // Resolve the current account through the guarded read-only RPC instead.
  const { data, error } = await supabase
    .rpc("get_current_staff_account")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    ...data,
    full_name: formatStaffName(data),
  } as StaffAccountSummary;
}
