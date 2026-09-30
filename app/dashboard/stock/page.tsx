export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";
import { StockMovementClient } from "./stock-movement-client";

export default async function StockPage() {
  const account = await getCurrentStaffAccount();
  if (!account) redirect("/setup");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("item")
    .select("item_id,current_price,stock_qty,reorder_level,status,product:product_id(product_name,brand)")
    .eq("sme_id", account.sme_id)
    .neq("status", "ARCHIVED")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const items = (data ?? []).map((item) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    return {
      item_id: item.item_id,
      product_name: product?.product_name ?? "Unknown product",
      brand: product?.brand ?? null,
      current_price: Number(item.current_price),
      stock_qty: Number(item.stock_qty),
      reorder_level: Number(item.reorder_level),
      status: item.status,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-2xl font-semibold">Stock control</h1>
            <p className="mt-2 text-sm text-slate-400">Every stock change is recorded with its staff actor.</p>
          </div>
          <a href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Back to workspace</a>
        </header>

        <StockMovementClient role={account.role} initialItems={items} />
      </div>
    </main>
  );
}
