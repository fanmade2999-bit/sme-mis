import { redirect } from "next/navigation";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";

type SalesRow = {
  sales_date: string;
  sold_qty: number | null;
  sales_value: number | null;
};

type InventoryRow = {
  item_id: string;
  product_name: string;
  stock_qty: number;
  reorder_level: number;
  is_low_stock: boolean;
  inventory_retail_value: number | null;
};

type FreshnessRow = {
  item_id: string;
  product_name: string;
  current_price: number;
  price_updated_at: string;
  days_since_price_update: number;
  is_stale: boolean;
};

type ProfitRow = {
  sales_date: string;
  item_id: string;
  product_id: string;
  product_name: string;
  sold_qty: number;
  sales_value: number;
  cost_coverage: number;
  gross_profit: number | null;
};

function formatMoney(value: number | null | undefined) {
  if (value == null) return "Unavailable";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function AnalyticsPage() {
  const account = await getCurrentStaffAccount();

  if (!account) redirect("/setup");

  const supabase = await createClient();
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const fromIso = from.toISOString();

  const [sales, inventory, freshness, profit] = await Promise.all([
    supabase
      .from("v_sales_daily")
      .select("sales_date,sold_qty,sales_value")
      .eq("sme_id", account.sme_id)
      .gte("sales_date", from.toISOString().slice(0, 10))
      .order("sales_date", { ascending: false }),
    supabase
      .from("v_inventory_status")
      .select("item_id,product_name,stock_qty,reorder_level,is_low_stock,inventory_retail_value")
      .eq("sme_id", account.sme_id)
      .order("inventory_retail_value", { ascending: false }),
    supabase
      .from("v_price_freshness")
      .select("item_id,product_name,current_price,price_updated_at,days_since_price_update,is_stale")
      .eq("sme_id", account.sme_id)
      .order("days_since_price_update", { ascending: false }),
    account.role === "OWNER"
      ? supabase.rpc("get_owner_profit_summary", {
          p_from: fromIso,
          p_to: now.toISOString(),
        })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (sales.error) throw new Error(sales.error.message);
  if (inventory.error) throw new Error(inventory.error.message);
  if (freshness.error) throw new Error(freshness.error.message);
  if (profit.error) throw new Error(profit.error.message);

  const salesRows = (sales.data ?? []) as SalesRow[];
  const inventoryRows = (inventory.data ?? []) as InventoryRow[];
  const freshnessRows = (freshness.data ?? []) as FreshnessRow[];
  const profitRows = (profit.data ?? []) as ProfitRow[];

  const salesValue = salesRows.reduce((sum, row) => sum + Number(row.sales_value ?? 0), 0);
  const soldQty = salesRows.reduce((sum, row) => sum + Number(row.sold_qty ?? 0), 0);
  const lowStock = inventoryRows.filter((row) => row.is_low_stock);
  const stalePrices = freshnessRows.filter((row) => row.is_stale);

  const totalProfit = profitRows
    .filter((row) => row.gross_profit != null)
    .reduce((sum, row) => sum + Number(row.gross_profit), 0);

  const fullyCostedSales = profitRows.filter((row) => Number(row.cost_coverage) === 100);
  const profitCoverageQty = profitRows.reduce(
    (sum, row) => sum + Number(row.sold_qty ?? 0) * (Number(row.cost_coverage ?? 0) / 100),
    0,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-2xl font-semibold">Analytics</h1>
            <p className="mt-2 text-sm text-slate-400">Last 30 days of validated operational data.</p>
          </div>
          <a href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
            Back to workspace
          </a>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Sales value</p>
            <p className="mt-2 text-2xl font-semibold">{formatMoney(salesValue)}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Units sold</p>
            <p className="mt-2 text-2xl font-semibold">{soldQty.toLocaleString()}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Low-stock items</p>
            <p className="mt-2 text-2xl font-semibold">{lowStock.length}</p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Stale prices</p>
            <p className="mt-2 text-2xl font-semibold">{stalePrices.length}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Low-stock watchlist</h2>
            <div className="mt-4 divide-y divide-slate-800">
              {lowStock.slice(0, 10).map((row) => (
                <div key={row.item_id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{row.product_name}</p>
                    <p className="text-xs text-slate-500">Reorder at {row.reorder_level}</p>
                  </div>
                  <span className="text-sm font-medium">{row.stock_qty} on hand</span>
                </div>
              ))}
              {lowStock.length === 0 ? <p className="text-sm text-slate-500">No low-stock items.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Price freshness</h2>
            <div className="mt-4 divide-y divide-slate-800">
              {stalePrices.slice(0, 10).map((row) => (
                <div key={row.item_id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{row.product_name}</p>
                    <p className="text-xs text-slate-500">{Number(row.days_since_price_update).toFixed(0)} days since update</p>
                  </div>
                  <span className="text-sm font-medium">{formatMoney(Number(row.current_price))}</span>
                </div>
              ))}
              {stalePrices.length === 0 ? <p className="text-sm text-slate-500">No prices older than 30 days.</p> : null}
            </div>
          </article>
        </section>

        {account.role === "OWNER" ? (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Owner margin view</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Profit is shown only for sales with complete cost coverage. Covered quantity: {profitCoverageQty.toLocaleString()} units.
                </p>
              </div>
              <p className="text-lg font-semibold">{formatMoney(totalProfit)}</p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Units</th>
                    <th className="px-3 py-3">Sales</th>
                    <th className="px-3 py-3">Cost coverage</th>
                    <th className="px-3 py-3">Gross profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {profitRows.slice(0, 20).map((row) => (
                    <tr key={row.item_id + String(row.sales_date)}>
                      <td className="px-3 py-3">{String(row.sales_date)}</td>
                      <td className="px-3 py-3 font-medium">{row.product_name}</td>
                      <td className="px-3 py-3">{Number(row.sold_qty).toLocaleString()}</td>
                      <td className="px-3 py-3">{formatMoney(Number(row.sales_value))}</td>
                      <td className="px-3 py-3">{Number(row.cost_coverage).toFixed(2)}%</td>
                      <td className="px-3 py-3">{row.gross_profit == null ? "Unavailable" : formatMoney(Number(row.gross_profit))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profitRows.length === 0 ? <p className="mt-4 text-sm text-slate-500">No sales have been recorded in the last 30 days.</p> : null}
              {fullyCostedSales.length === 0 && profitRows.length > 0 ? (
                <p className="mt-4 text-sm text-amber-300">No reporting row has complete cost coverage yet, so gross profit remains unavailable.</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
