export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";
import { StaffManagement } from "./staff-management";

export default async function StaffPage() {
  const account = await getCurrentStaffAccount();

  if (!account) redirect("/setup");
  if (account.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_account")
    .select("account_id, first_name, middle_name, last_name, name_suffix, role, is_active, created_at")
    .eq("sme_id", account.sme_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-2xl font-semibold">Staff management</h1>
            <p className="mt-2 text-sm text-slate-400">Owner-only controls for the people who can access this SME workspace.</p>
          </div>
          <a href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
            Back to workspace
          </a>
        </header>

        <StaffManagement initialStaff={data ?? []} ownerName={account.full_name} />
      </div>
    </main>
  );
}
