"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "MANAGER" | "STAFF";

type StaffRow = {
  account_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  name_suffix: string | null;
  role: "OWNER" | Role;
  is_active: boolean;
  created_at: string;
};

function formatName(row: Pick<StaffRow, "first_name" | "middle_name" | "last_name" | "name_suffix">) {
  return [row.first_name, row.middle_name, row.last_name, row.name_suffix]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

async function readFunctionError(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context;

  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: string; message?: string };
      if (body.error || body.message) return body.error ?? body.message ?? "Invitation failed.";
    } catch {
      // Fall through to the SDK error message.
    }
  }

  return error instanceof Error ? error.message : "The staff operation failed.";
}

export function StaffManagement({
  initialStaff,
  ownerName,
}: {
  initialStaff: StaffRow[];
  ownerName: string;
}) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSuffix, setNameSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("STAFF");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");
    setLoading(true);

    const { data, error: invokeError } = await supabase.functions.invoke("invite-staff", {
      body: {
        email: email.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        name_suffix: nameSuffix.trim() || null,
        role,
      },
    });

    if (invokeError) {
      setError(await readFunctionError(invokeError));
      setLoading(false);
      return;
    }

    if (!data?.account) {
      setError(data?.error ?? "Invitation failed.");
      setLoading(false);
      return;
    }

    setStaff((current) => [data.account, ...current]);
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setNameSuffix("");
    setEmail("");
    setRole("STAFF");
    setMessage("Invitation sent. The new staff member must complete the invitation flow before accessing the workspace.");
    setLoading(false);
    router.refresh();
  }

  async function changeRole(accountId: string, nextRole: Role) {
    const supabase = createClient();
    setError("");
    setMessage("");

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
    setMessage("Staff role updated.");
    router.refresh();
  }

  async function revoke(accountId: string) {
    const target = staff.find((row) => row.account_id === accountId);
    if (!target) return;
    const targetName = formatName(target);
    if (!window.confirm(`Revoke access for ${targetName}? They will no longer be able to access this SME workspace until restored.`)) {
      return;
    }

    const supabase = createClient();
    setError("");
    setMessage("");

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
    setMessage("Access revoked. The account record is retained for audit history.");
    router.refresh();
  }

  async function reactivate(accountId: string) {
    const supabase = createClient();
    setError("");
    setMessage("");

    const { error: rpcError } = await supabase.rpc("reactivate_staff_account", {
      p_account_id: accountId,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setStaff((current) =>
      current.map((row) =>
        row.account_id === accountId ? { ...row, is_active: true } : row,
      ),
    );
    setMessage("Staff access restored.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Who can do what?</h2>
        <p className="mt-1 text-sm text-slate-400">Staff access is controlled by role. Your current account is Owner ({ownerName}).</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="font-medium text-emerald-400">Owner</p>
            <p className="mt-2 text-sm text-slate-300">Manage staff, catalog, prices, stock, and Owner-only cost/margin information.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="font-medium text-slate-200">Manager</p>
            <p className="mt-2 text-sm text-slate-300">Manage catalog, prices, stock, categories, and locations. Cannot manage staff accounts or item cost.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="font-medium text-slate-200">Staff</p>
            <p className="mt-2 text-sm text-slate-300">View/search the catalog and record sale deductions. Cannot manage catalog settings or staff access.</p>
          </article>
        </div>
      </section>

      <form onSubmit={invite} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Invite Manager or Staff</h2>
        <p className="mt-1 text-sm text-slate-400">Only the Owner can invite people into this SME. The invitation creates their account and sends an email to complete access.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} placeholder="Middle name (optional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name (optional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <input value={nameSuffix} onChange={(event) => setNameSuffix(event.target.value)} placeholder="Suffix (optional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email address" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>

        {error ? <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

        <button type="submit" disabled={loading} className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 sm:w-auto">
          {loading ? "Sending..." : "Send invitation"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Staff accounts</h2>
          <p className="mt-1 text-sm text-slate-400">Owner can switch Manager/Staff roles, revoke access, or restore previously revoked access. The Owner account cannot be revoked here.</p>
        </div>

        <div className="divide-y divide-slate-800">
          {staff.map((row) => (
            <article key={row.account_id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{formatName(row)}</p>
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

              {row.role !== "OWNER" && !row.is_active ? (
                <button
                  onClick={() => reactivate(row.account_id)}
                  className="rounded-lg border border-emerald-800 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-950/40"
                >
                  Restore access
                </button>
              ) : null}
            </article>
          ))}

          {staff.length === 0 ? <p className="p-6 text-sm text-slate-500">No staff accounts yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
