"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: bootstrapError } = await supabase.rpc("bootstrap_sme_owner", {
      p_business_name: businessName.trim(),
      p_full_name: fullName.trim(),
    });

    if (bootstrapError) {
      setError(bootstrapError.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div>
          <p className="text-sm font-medium text-emerald-400">SME MIS</p>
          <h1 className="mt-2 text-3xl font-semibold">Set up your SME</h1>
          <p className="mt-2 text-sm text-slate-400">Your authenticated account becomes the first Owner.</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Owner name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            type="text"
            autoComplete="name"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Business name</span>
          <input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            type="text"
            autoComplete="organization"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2"
          />
        </label>

        {error ? <p className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Setting up..." : "Create SME workspace"}
        </button>
      </form>
    </main>
  );
}
