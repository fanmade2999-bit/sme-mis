"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSuffix, setNameSuffix] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setLoading(true);

    try {
      const { error: bootstrapError } = await supabase.rpc("bootstrap_sme_owner", {
        p_business_name: businessName.trim(),
        p_first_name: firstName.trim(),
        p_middle_name: middleName.trim() || null,
        p_last_name: lastName.trim() || null,
        p_name_suffix: nameSuffix.trim() || null,
      });

      if (bootstrapError) {
        setError(bootstrapError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to complete SME setup.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div>
          <p className="text-sm font-medium text-emerald-400">SME MIS</p>
          <h1 className="mt-2 text-3xl font-semibold">Set up your SME</h1>
          <p className="mt-2 text-sm text-slate-400">Your authenticated account becomes the first Owner.</p>
        </div>

        <div>
          <p className="text-sm font-medium">Owner name</p>
          <p className="mt-1 text-xs text-slate-500">Name parts are stored separately for cleaner records and reporting.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} type="text" autoComplete="given-name" placeholder="First name" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
            <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} type="text" autoComplete="additional-name" placeholder="Middle name (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} type="text" autoComplete="family-name" placeholder="Last name (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
            <input value={nameSuffix} onChange={(event) => setNameSuffix(event.target.value)} type="text" autoComplete="honorific-suffix" placeholder="Suffix (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Business name</span>
          <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} type="text" autoComplete="organization" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
        </label>

        {error ? <p className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}

        <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Setting up..." : "Create SME workspace"}
        </button>
      </form>
    </main>
  );
}
