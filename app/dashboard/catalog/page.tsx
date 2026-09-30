export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";
import { CatalogClient } from "./catalog-client";

export default async function CatalogPage() {
  const account = await getCurrentStaffAccount();
  if (!account) redirect("/setup");

  const supabase = await createClient();

  const [categories, items] = await Promise.all([
    supabase
      .from("category")
      .select("category_id,category_name")
      .eq("sme_id", account.sme_id)
      .order("category_name"),
    supabase
      .from("item")
      .select("item_id,product_id,category_id,current_price,stock_qty,reorder_level,shelf_location,qr_code,status,product:product_id(product_name,brand)")
      .eq("sme_id", account.sme_id)
      .order("created_at", { ascending: false }),
  ]);

  if (categories.error) throw new Error(categories.error.message);
  if (items.error) throw new Error(items.error.message);

  const normalizedItems = (items.data ?? []).map((item) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    return {
      item_id: item.item_id,
      product_id: item.product_id,
      category_id: item.category_id,
      product_name: product?.product_name ?? "Unknown product",
      brand: product?.brand ?? null,
      current_price: Number(item.current_price),
      stock_qty: Number(item.stock_qty),
      reorder_level: Number(item.reorder_level),
      shelf_location: item.shelf_location,
      qr_code: item.qr_code,
      status: item.status,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-2xl font-semibold">Product & item catalog</h1>
            <p className="mt-2 text-sm text-slate-400">Manage shared product identities and SME-specific listings.</p>
          </div>
          <a href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Back to workspace</a>
        </header>

        <CatalogClient
          smeId={account.sme_id}
          role={account.role}
          initialCategories={categories.data ?? []}
          initialItems={normalizedItems}
        />
      </div>
    </main>
  );
}
