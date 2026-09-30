"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "OWNER" | "MANAGER" | "STAFF";
type Category = { category_id: string; category_name: string };
type Item = {
  item_id: string;
  product_id: string;
  category_id: string;
  product_name: string;
  brand: string | null;
  current_price: number;
  stock_qty: number;
  reorder_level: number;
  shelf_location: string | null;
  qr_code: string | null;
  status: "UNFINISHED" | "ACTIVE" | "ARCHIVED";
};

function canonicalKey(parts: string[]) {
  return parts.map((part) => part.trim().toLowerCase()).filter(Boolean).join("|");
}

export function CatalogClient({
  smeId,
  role,
  initialCategories,
  initialItems,
}: {
  smeId: string;
  role: Role;
  initialCategories: Category[];
  initialItems: Item[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [categoryName, setCategoryName] = useState("");
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [variant, setVariant] = useState("");
  const [sizeValue, setSizeValue] = useState("");
  const [sizeUnit, setSizeUnit] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategories[0]?.category_id ?? "");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [shelfLocation, setShelfLocation] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [initialStock, setInitialStock] = useState("0");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = categoryName.trim();
    if (!name) return;

    const { data, error: insertError } = await supabase
      .from("category")
      .insert({ sme_id: smeId, category_name: name })
      .select("category_id,category_name")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCategories((current) => [...current, data]);
    setCategoryId(data.category_id);
    setCategoryName("");
    setMessage("Category created.");
    router.refresh();
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    if (!categoryId) {
      setError("Create or select a category first.");
      setCreating(false);
      return;
    }

    const currentPrice = Number(price);
    const parsedInitialStock = Number.parseInt(initialStock, 10);
    const parsedReorder = Number.parseInt(reorderLevel, 10);

    if (!productName.trim() || !Number.isFinite(currentPrice) || currentPrice < 0) {
      setError("Product name and a valid non-negative price are required.");
      setCreating(false);
      return;
    }

    if (
      !Number.isInteger(parsedInitialStock) ||
      parsedInitialStock < 0 ||
      !Number.isInteger(parsedReorder) ||
      parsedReorder < 0
    ) {
      setError("Initial stock and reorder level must be zero or greater.");
      setCreating(false);
      return;
    }

    if (role !== "OWNER" && cost.trim()) {
      setError("Only the Owner may set item cost.");
      setCreating(false);
      return;
    }

    const key = canonicalKey([barcode, brand, productName, variant, sizeValue, sizeUnit]);

    const { data: productId, error: productError } = await supabase.rpc("ensure_product", {
      p_brand: brand.trim() || null,
      p_product_name: productName.trim(),
      p_variant: variant.trim() || null,
      p_package_size_value: sizeValue ? Number(sizeValue) : null,
      p_package_size_unit: sizeUnit.trim() || null,
      p_barcode: barcode.trim() || null,
      p_canonical_key: key,
    });

    if (productError) {
      setError(productError.message);
      setCreating(false);
      return;
    }

    const { data: item, error: itemError } = await supabase.rpc("create_item", {
      p_product_id: productId,
      p_category_id: categoryId,
      p_current_price: currentPrice,
      p_cost: role === "OWNER" && cost.trim() ? Number(cost) : null,
      p_reorder_level: parsedReorder,
      p_shelf_location: shelfLocation.trim() || null,
      p_qr_code: qrCode.trim() || null,
      p_photo_path: null,
      p_public_visible: true,
      p_initial_stock: parsedInitialStock,
    });

    if (itemError) {
      setError(itemError.message);
      setCreating(false);
      return;
    }

    setItems((current) => [
      {
        item_id: item.item_id,
        product_id: item.product_id,
        category_id: item.category_id,
        product_name: productName.trim(),
        brand: brand.trim() || null,
        current_price: Number(item.current_price),
        stock_qty: Number(item.stock_qty),
        reorder_level: Number(item.reorder_level),
        shelf_location: item.shelf_location,
        qr_code: item.qr_code,
        status: item.status,
      },
      ...current,
    ]);
    setBrand("");
    setProductName("");
    setVariant("");
    setSizeValue("");
    setSizeUnit("");
    setBarcode("");
    setPrice("");
    setCost("");
    setReorderLevel("0");
    setShelfLocation("");
    setQrCode("");
    setInitialStock("0");
    setMessage("Item created.");
    setCreating(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <form onSubmit={createItem} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Add item</h2>
          <p className="mt-1 text-sm text-slate-400">Product identity is shared globally; the item listing belongs to this SME.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Variant" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={sizeValue} onChange={(e) => setSizeValue(e.target.value)} type="number" min="0" step="any" placeholder="Package size" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} placeholder="Size unit (g, mL, pcs...)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="Selling price" required className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            {role === "OWNER" ? <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min="0" step="0.01" placeholder="Cost (Owner only)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" /> : null}
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 sm:col-span-2">
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
            </select>
            <input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} type="number" min="0" step="1" placeholder="Reorder level" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={initialStock} onChange={(e) => setInitialStock(e.target.value)} type="number" min="0" step="1" placeholder="Opening stock" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} placeholder="Shelf/location" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="QR binding (optional)" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
          {message ? <p className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

          <button type="submit" disabled={creating} className="mt-5 rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
            {creating ? "Creating..." : "Create item"}
          </button>
        </form>

        <form onSubmit={addCategory} className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="mt-1 text-sm text-slate-400">Categories are SME-specific.</p>
          <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New category" required className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <button className="mt-3 w-full rounded-lg border border-slate-700 px-4 py-2.5 font-medium hover:bg-slate-800">Add category</button>
          <div className="mt-5 space-y-2">
            {categories.map((category) => <div key={category.category_id} className="rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-300">{category.category_name}</div>)}
          </div>
        </form>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <h2 className="text-lg font-semibold">Current catalog</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {items.map((item) => (
            <article key={item.item_id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{item.brand ? item.brand + " · " : ""}{item.product_name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {item.current_price.toLocaleString("en-PH", { style: "currency", currency: "PHP" })} · {item.stock_qty} in stock · reorder {item.reorder_level}
                </p>
              </div>
              <div className="text-sm text-slate-500">{item.status}</div>
            </article>
          ))}
          {items.length === 0 ? <p className="p-6 text-sm text-slate-500">No items yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
