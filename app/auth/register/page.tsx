"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameSuffix, setNameSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim() || null,
          name_suffix: nameSuffix.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/setup");
      router.refresh();
      return;
    }

    setMessage("Account created. Check your email to confirm your account, then sign in to continue setup.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div>
          <p className="text-sm font-medium text-emerald-400">SME MIS</p>
          <h1 className="mt-2 text-3xl font-semibold">Create owner account</h1>
          <p className="mt-2 text-sm text-slate-400">The first account can bootstrap one SME workspace.</p>
        </div>

        <div>
          <p className="text-sm font-medium">Name</p>
          <p className="mt-1 text-xs text-slate-500">Stored as separate name parts.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} type="text" autoComplete="given-name" placeholder="First name" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
            <input value={middleName} onChange={(event) => setMiddleName(event.target.value)} type="text" autoComplete="additional-name" placeholder="Middle name (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} type="text" autoComplete="family-name" placeholder="Last name (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
            <input value={nameSuffix} onChange={(event) => setNameSuffix(event.target.value)} type="text" autoComplete="honorific-suffix" placeholder="Suffix (optional)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-emerald-500 focus:ring-2" />
        </label>

        {error ? <p className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

        <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Creating..." : "Create account"}
        </button>

        <p className="text-sm text-slate-400">
          Already registered? <a className="text-emerald-400 hover:underline" href="/auth/login">Sign in</a>
        </p>
      </form>
    </main>
  );
}
