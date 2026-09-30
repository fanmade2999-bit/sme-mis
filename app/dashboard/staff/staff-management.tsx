"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "MANAGER" | "STAFF";

type StaffRow = {
  account_id: string;
  full_name: string;
  role: "OWNER" | Role;
  is_active: boolean;
  created_at: string;
};

export function StaffManagement({ initialStaff }: { initialStaff: StaffRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [staff, setStaff] = useState(initialStaff);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { data, error: invokeError } = await supabase.functions.invoke("invite-staff", {
      body: { email, full_name: fullName, role },
    });

    if (invokeError) {
      setError(invokeError.message);
      setLoading(false);
      return;
    }

    if (!data?.account) {
      setError(data?.error ?? "Invitation failed.");
      setLoading(false);
      return;
    }

    setStaff((current) => [data.account, ...current]);
    setEmail("");
    setFullName("");
    setRole("STAFF");
    setMessage("Invitation sent.");
    setLoading(false);
    router.refresh();
  }

  async function changeRole(accountId: string, nextRole: Role) {
    setError("");
    const { error: rpcError } = await supabase.rpc("change_staff_role", {
      p_account_id: accountId,
      p_new_role: nextRole,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStaff((current) =>
      current.map((row) => (row.account_id === accountId ? { ...row, role: nextRole } : row)),
    );
    router.refresh();
  }

  async function revoke(accountId: string) {
    setError("");
    const { error: rpcError } = await supabase.rpc("revoke_staff_account", {
      p_account_id: accountId,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStaff((current) =>
      current.map((row) =>
        row.account_id === accountId ? { ...row, is_active: false } : row,
      ),
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Invite staff</h2>
        <p className="mt-1 text-sm text-slate-400">Only an Owner can invite a Manager or Staff member.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email"
            required
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2"
          >
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send invitation"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <h2 className="text-lg font-semibold">Staff accounts</h2>
        </div>

        <div className="divide-y divide-slate-800">
          {staff.map((row) => (
            <article key={row.account_id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{row.full_name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {row.role} · {row.is_active ? "Active" : "Revoked"}
                </p>
              </div>

              {row.role !== "OWNER" && row.is_active ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => changeRole(row.account_id, row.role === "STAFF" ? "MANAGER" : "STAFF")}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                  >
                    Make {row.role === "STAFF" ? "Manager" : "Staff"}
                  </button>
                  <button
                    onClick={() => revoke(row.account_id)}
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/40"
                  >
                    Revoke
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
