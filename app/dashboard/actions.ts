"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function setPublicListingEnabled(formData: FormData) {
  const account = await getCurrentStaffAccount();
  if (!account || account.role !== "OWNER") {
    throw new Error("Only Owner may change public listing settings.");
  }

  const enabled = formData.get("enabled") === "true";
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_sme_public_listing", {
    p_enabled: enabled,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/prices");
}
