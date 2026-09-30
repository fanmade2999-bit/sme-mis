import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function DashboardPage() {
  const account = await getCurrentStaffAccount();

  if (!account) redirect("/setup");

  const supabase = await createClient();

  const [inventoryResult, salesResult, freshnessResult, smeResult] = await Promise.all([
    supabase
      .from("v_inventory_status")
      .select("item_id,stock_qty,reorder_level,is_low_stock,inventory_retail_value")
      .eq("sme_id", account.sme_id),
    supabase
      .from("v_sales_daily")
      .select("sold_qty,sales_value")
      .eq("sme_id", account.sme_id),
    supabase
      .from("v_price_freshness")
      .select("item_id,is_stale")
      .eq("sme_id", account.sme_id),
    supabase
      .from("sme")
      .select("business_name")
      .eq("sme_id", account.sme_id)
      .single(),
  ]);

  if (inventoryResult.error) throw new Error(inventoryResult.error.message);
  if (salesResult.error) throw new Error(salesResult.error.message);
  if (freshnessResult.error) throw new Error(freshnessResult.error.message);
  if (smeResult.error) throw new Error(smeResult.error.message);

  const inventory = inventoryResult.data ?? [];
  const sales = salesResult.data ?? [];
  const freshness = freshnessResult.data ?? [];

  const retailValue = inventory.reduce(
    (sum, row) => sum + Number(row.inventory_retail_value ?? 0),
    0,
  );
  const lowStockCount = inventory.filter((row) => row.is_low_stock).length;
  const salesValue = sales.reduce((sum, row) => sum + Number(row.sales_value ?? 0), 0);
  const soldQty = sales.reduce((sum, row) => sum + Number(row.sold_qty ?? 0), 0);
  const stalePriceCount = freshness.filter((row) => row.is_stale).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-2xl font-semibold">{smeResult.data.business_name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              Signed in as {account.full_name} · {account.role}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {account.role === "OWNER" ? (
              <a href="/dashboard/staff" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
                Staff
              </a>
            ) : null}
            <a href="/dashboard/catalog" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Catalog</a>
            <a href="/dashboard/stock" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Stock</a>
            <a href="/dashboard/analytics" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Analytics
            </a>
            <form action={signOut}>
              <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Inventory retail value</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(retailValue)}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Low-stock items</p>
            <p className="mt-2 text-2xl font-semibold">{lowStockCount}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Recorded sales value</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(salesValue)}</p>
            <p className="mt-1 text-xs text-slate-500">{soldQty.toLocaleString()} units recorded</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Stale prices</p>
            <p className="mt-2 text-2xl font-semibold">{stalePriceCount}</p>
            <p className="mt-1 text-xs text-slate-500">More than 30 days since update</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/dashboard/catalog" className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
            <p className="text-sm text-emerald-400">Catalog</p>
            <h2 className="mt-1 text-lg font-semibold">{account.role === "STAFF" ? "View products & items" : "Manage products & items"}</h2>
            <p className="mt-2 text-sm text-slate-500">{account.role === "STAFF" ? "View the current SME catalog and stock levels." : "Create listings, categories, prices, and audited opening stock."}</p>
          </a>
          <a href="/dashboard/stock" className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
            <p className="text-sm text-emerald-400">Stock</p>
            <h2 className="mt-1 text-lg font-semibold">Record stock movement</h2>
            <p className="mt-2 text-sm text-slate-500">Sales, restocks, losses, spoilage, and corrections with staff attribution.</p>
          </a>
          <a href="/dashboard/analytics" className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
            <p className="text-sm text-emerald-400">Analytics</p>
            <h2 className="mt-1 text-lg font-semibold">View MIS reporting</h2>
            <p className="mt-2 text-sm text-slate-500">Sales, inventory, price freshness, and Owner margin coverage.</p>
          </a>
          {account.role === "OWNER" ? (
            <a href="/dashboard/staff" className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
              <p className="text-sm text-emerald-400">Access</p>
              <h2 className="mt-1 text-lg font-semibold">Manage staff</h2>
              <p className="mt-2 text-sm text-slate-500">Owner-only invitations, role changes, and revocation.</p>
            </a>
          ) : null}
          <Link href="/" className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700">
            <p className="text-sm text-emerald-400">Public</p>
            <h2 className="mt-1 text-lg font-semibold">Public price layer</h2>
            <p className="mt-2 text-sm text-slate-500">Reserved for the public comparison experience.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
