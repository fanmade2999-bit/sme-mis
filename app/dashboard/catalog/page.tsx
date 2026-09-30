export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentStaffAccount } from "@/lib/mis/current-user";
import { createClient } from "@/lib/supabase/server";
import { CatalogClient } from "./catalog-client";

export default async function CatalogPage() {
  const account = await getCurrentStaffAccount();
  if (!account) redirect("/setup");

  const supabase = await createClient();

  const [categories, items, itemCategories, locations] = await Promise.all([
    supabase
      .from("category")
      .select("category_id,category_name")
      .eq("sme_id", account.sme_id)
      .order("category_name"),
    supabase
      .from("item")
      .select("item_id,product_id,category_id,current_price,stock_qty,reorder_level,shelf_location,shelf_location_id,qr_code,status,product:product_id(product_name,brand)")
      .eq("sme_id", account.sme_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("item_category")
      .select("item_id,category_id")
      .eq("sme_id", account.sme_id),
    supabase
      .from("shelf_location")
      .select("location_id,location_name")
      .eq("sme_id", account.sme_id)
      .eq("is_active", true)
      .order("location_name"),
  ]);

  if (categories.error) throw new Error(categories.error.message);
  if (items.error) throw new Error(items.error.message);
  if (itemCategories.error) throw new Error(itemCategories.error.message);
  if (locations.error) throw new Error(locations.error.message);

  const linksByItem = new Map<string, string[]>();
  for (const link of itemCategories.data ?? []) {
    const current = linksByItem.get(link.item_id) ?? [];
    current.push(link.category_id);
    linksByItem.set(link.item_id, current);
  }

  const categoryNames = new Map(
    (categories.data ?? []).map((category) => [category.category_id, category.category_name]),
  );

  const normalizedItems = (items.data ?? []).map((item) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const categoryIds = linksByItem.get(item.item_id) ?? [item.category_id];

    return {
      item_id: item.item_id,
      product_id: item.product_id,
      category_id: item.category_id,
      category_ids: categoryIds,
      category_names: categoryIds
        .map((categoryId) => categoryNames.get(categoryId))
        .filter((name): name is string => Boolean(name)),
      product_name: product?.product_name ?? "Unknown product",
      brand: product?.brand ?? null,
      current_price: Number(item.current_price),
      stock_qty: Number(item.stock_qty),
      reorder_level: Number(item.reorder_level),
      shelf_location: item.shelf_location,
      shelf_location_id: item.shelf_location_id,
      qr_code: item.qr_code,
      status: item.status,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
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
          role={account.role}
          initialCategories={categories.data ?? []}
          initialLocations={locations.data ?? []}
          initialItems={normalizedItems}
        />
      </div>
    </main>
  );
}
