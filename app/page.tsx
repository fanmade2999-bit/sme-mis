export default function Home() {
  return (
    <main className="min-h-svh flex items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <div>
          <p className="text-sm font-medium text-emerald-400">SME MIS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Price and Stock Control</h1>
          <p className="mt-3 text-slate-400">
            Multi-tenant management information system with accountable price and stock changes and a public price comparison layer.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="/auth/login" className="rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400">
            Sign in
          </a>
          <a href="/auth/register" className="rounded-lg border border-slate-700 px-4 py-2.5 font-medium hover:bg-slate-800">
            Create owner account
          </a>
          <a href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2.5 font-medium hover:bg-slate-800">
            Open workspace
          </a>
        </div>
      </section>
    </main>
  );
}
