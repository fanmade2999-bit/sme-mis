import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";

export default async function DashboardPage() {
  const account = await getCurrentStaffAccount();

  if (!account) {
    redirect("/setup");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-2xl font-semibold">Workspace ready</h1>
            <p className="mt-2 text-sm text-slate-400">
              Signed in as {account.full_name} · {account.role}
            </p>
          </div>

          <form action={signOut}>
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800">
              Sign out
            </button>
          </form>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Catalog</p>
            <h2 className="mt-1 text-lg font-semibold">Products & Items</h2>
            <p className="mt-2 text-sm text-slate-500">Next module: schema-driven catalog management.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Inventory</p>
            <h2 className="mt-1 text-lg font-semibold">Stock Control</h2>
            <p className="mt-2 text-sm text-slate-500">Stock changes will use atomic database transactions.</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Analytics</p>
            <h2 className="mt-1 text-lg font-semibold">MIS Reporting</h2>
            <p className="mt-2 text-sm text-slate-500">Reporting views will build from validated operational data.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
