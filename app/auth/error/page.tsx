export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-medium text-red-400">Authentication error</p>
        <h1 className="mt-2 text-2xl font-semibold">The confirmation link is invalid or expired.</h1>
        <p className="mt-3 text-sm text-slate-400">Return to sign in and use a fresh confirmation link.</p>
        <a href="/auth/login" className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400">
          Back to sign in
        </a>
      </section>
    </main>
  );
}
