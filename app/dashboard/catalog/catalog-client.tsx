"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "OWNER" | "MANAGER" | "STAFF";
type Category = { category_id: string; category_name: string };
type Location = { location_id: string; location_name: string };
type Item = {
  item_id: string;
  product_id: string;
  category_id: string;
  category_ids: string[];
  category_names: string[];
  product_name: string;
  brand: string | null;
  current_price: number;
  stock_qty: number;
  reorder_level: number;
  shelf_location: string | null;
  shelf_location_id: string | null;
  qr_code: string | null;
  status: "UNFINISHED" | "ACTIVE" | "ARCHIVED";
};

const SIZE_UNITS = [
  "g",
  "kg",
  "mg",
  "mL",
  "L",
  "pcs",
  "pack",
  "box",
  "bottle",
  "tube",
  "sachet",
  "roll",
  "pair",
  "dozen",
];

function canonicalKey(parts: string[]) {
  return parts.map((part) => part.trim().toLowerCase()).filter(Boolean).join("|");
}

export function CatalogClient({
  role,
  initialCategories,
  initialLocations,
  initialItems,
}: {
  role: Role;
  initialCategories: Category[];
  initialLocations: Location[];
  initialItems: Item[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [locations, setLocations] = useState(initialLocations);
  const [items, setItems] = useState(initialItems);

  const [categoryName, setCategoryName] = useState("");
  const [showCategoryCreate, setShowCategoryCreate] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [variant, setVariant] = useState("");
  const [sizeValue, setSizeValue] = useState("");
  const [sizeUnit, setSizeUnit] = useState("");
  const [customSizeUnit, setCustomSizeUnit] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  const [reorderLevel, setReorderLevel] = useState("");
  const [initialStock, setInitialStock] = useState("");

  const [shelfLocationId, setShelfLocationId] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [showLocationCreate, setShowLocationCreate] = useState(false);

  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");

    const name = categoryName.trim();
    if (!name) return;

    const { data, error: insertError } = await supabase.rpc("create_sme_category", {
      p_category_name: name,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCategories((current) => [...current, data].sort((a, b) => a.category_name.localeCompare(b.category_name)));
    setSelectedCategoryIds((current) => [...new Set([...current, data.category_id])]);
    setCategoryName("");
    setShowCategoryCreate(false);
    setMessage("Category created and selected.");
    router.refresh();
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");

    const name = newLocationName.trim();
    if (!name) return;

    const { data, error: locationError } = await supabase.rpc("create_shelf_location", {
      p_location_name: name,
    });

    if (locationError) {
      setError(locationError.message);
      return;
    }

    const nextLocation: Location = {
      location_id: data.location_id,
      location_name: data.location_name,
    };

    setLocations((current) =>
      [...current.filter((location) => location.location_id !== nextLocation.location_id), nextLocation]
        .sort((a, b) => a.location_name.localeCompare(b.location_name)),
    );
    setShelfLocationId(nextLocation.location_id);
    setNewLocationName("");
    setShowLocationCreate(false);
    setMessage("Shelf/location created and selected.");
    router.refresh();
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  async function changePrice(itemId: string) {
    const supabase = createClient();
    setError("");
    setMessage("");
    setPriceSaving(true);

    const nextPrice = Number(editingPrice);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setError("Price must be zero or greater.");
      setPriceSaving(false);
      return;
    }

    const { data, error: priceError } = await supabase.rpc("set_item_price", {
      p_item_id: itemId,
      p_new_price: nextPrice,
    });

    if (priceError) {
      setError(priceError.message);
      setPriceSaving(false);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.item_id === itemId
          ? { ...item, current_price: Number(data.current_price) }
          : item,
      ),
    );
    setEditingPriceId(null);
    setEditingPrice("");
    setMessage("Price updated and change logged.");
    setPriceSaving(false);
    router.refresh();
  }

  async function archive(itemId: string) {
    const supabase = createClient();
    setError("");
    setMessage("");

    const { error: archiveError } = await supabase.rpc("archive_item", {
      p_item_id: itemId,
    });

    if (archiveError) {
      setError(archiveError.message);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.item_id === itemId ? { ...item, status: "ARCHIVED" } : item,
      ),
    );
    setMessage("Item archived. Historical movements remain intact.");
    router.refresh();
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");
    setCreating(true);

    if (selectedCategoryIds.length === 0) {
      setError("Select at least one category.");
      setCreating(false);
      return;
    }

    const currentPrice = Number(price);
    const parsedInitialStock = initialStock.trim() ? Number.parseInt(initialStock, 10) : 0;
    const parsedReorder = reorderLevel.trim() ? Number.parseInt(reorderLevel, 10) : 0;
    const selectedSizeUnit = sizeUnit === "OTHER" ? customSizeUnit.trim() : sizeUnit;

    if (!productName.trim() || !Number.isFinite(currentPrice) || currentPrice < 0) {
      setError("Product name and a valid non-negative price are required.");
      setCreating(false);
      return;
    }

    if (sizeValue.trim() && (!Number.isFinite(Number(sizeValue)) || Number(sizeValue) <= 0)) {
      setError("Package size must be greater than zero when provided.");
      setCreating(false);
      return;
    }

    if (
      !Number.isInteger(parsedInitialStock) ||
      parsedInitialStock < 0 ||
      !Number.isInteger(parsedReorder) ||
      parsedReorder < 0
    ) {
      setError("Opening stock and reorder level must be whole numbers zero or greater.");
      setCreating(false);
      return;
    }

    if (sizeValue.trim() && !selectedSizeUnit) {
      setError("Choose a size unit when package size is provided.");
      setCreating(false);
      return;
    }

    if (role !== "OWNER" && cost.trim()) {
      setError("Only the Owner may set item cost.");
      setCreating(false);
      return;
    }

    if (role === "OWNER" && cost.trim() && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) {
      setError("Cost must be zero or greater.");
      setCreating(false);
      return;
    }

    const key = canonicalKey([barcode, brand, productName, variant, sizeValue, selectedSizeUnit]);

    const { data: item, error: itemError } = await supabase.rpc("create_catalog_item", {
      p_brand: brand.trim() || null,
      p_product_name: productName.trim(),
      p_variant: variant.trim() || null,
      p_package_size_value: sizeValue.trim() ? Number(sizeValue) : null,
      p_package_size_unit: selectedSizeUnit || null,
      p_barcode: barcode.trim() || null,
      p_canonical_key: key,
      p_category_id: selectedCategoryIds[0],
      p_category_ids: selectedCategoryIds,
      p_current_price: currentPrice,
      p_cost: role === "OWNER" && cost.trim() ? Number(cost) : null,
      p_reorder_level: parsedReorder,
      p_shelf_location: null,
      p_shelf_location_id: shelfLocationId || null,
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
        category_ids: item.category_ids ?? selectedCategoryIds,
        category_names: selectedCategoryIds
          .map((id) => categories.find((category) => category.category_id === id)?.category_name)
          .filter((name): name is string => Boolean(name)),
        product_name: productName.trim(),
        brand: brand.trim() || null,
        current_price: Number(item.current_price),
        stock_qty: Number(item.stock_qty),
        reorder_level: Number(item.reorder_level),
        shelf_location: item.shelf_location,
        shelf_location_id: item.shelf_location_id,
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
    setCustomSizeUnit("");
    setBarcode("");
    setPrice("");
    setCost("");
    setReorderLevel("");
    setInitialStock("");
    setShelfLocationId("");
    setQrCode("");
    setSelectedCategoryIds([]);
    setMessage("Item created.");
    setCreating(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {role !== "STAFF" ? (
        <form onSubmit={createItem} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">Add item</h2>
            <p className="mt-1 text-sm text-slate-400">
              Product identity is shared globally; the item listing belongs to this SME.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Brand <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Product name</span>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Variant <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={variant} onChange={(e) => setVariant(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Barcode <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} inputMode="numeric" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">Manual barcode value for now; camera scanning is not implemented yet.</span>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Package size <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={sizeValue} onChange={(e) => setSizeValue(e.target.value)} type="number" min="0" step="any" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Size unit <span className="font-normal text-slate-500">(optional unless size is set)</span></span>
              <select value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                <option value="">Select a unit</option>
                {SIZE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                <option value="OTHER">Other</option>
              </select>
              {sizeUnit === "OTHER" ? (
                <input
                  value={customSizeUnit}
                  onChange={(e) => setCustomSizeUnit(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  placeholder="Custom unit"
                />
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium">Selling price</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </label>

            {role === "OWNER" ? (
              <label className="block">
                <span className="text-sm font-medium">Cost <span className="font-normal text-slate-500">(optional · Owner only)</span></span>
                <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min="0" step="0.01" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                <span className="mt-1 block text-xs text-slate-500">Leave blank when cost is unknown; margin will remain unavailable.</span>
              </label>
            ) : null}

            <div className="sm:col-span-2">
              <span className="text-sm font-medium">Categories</span>
              <span className="ml-1 text-xs text-slate-500">Select one or more</span>
              <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
                {categories.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {categories.map((category) => (
                      <label key={category.category_id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(category.category_id)}
                          onChange={() => toggleCategory(category.category_id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{category.category_name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No categories yet.</p>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">An item can belong to multiple SME categories.</p>
              <button
                type="button"
                onClick={() => setShowCategoryCreate((current) => !current)}
                className="mt-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                {showCategoryCreate ? "Cancel" : "+ Create new category"}
              </button>
              {showCategoryCreate ? (
                <form onSubmit={addCategory} className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category name"
                    required
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  />
                  <button className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:bg-white">Create</button>
                </form>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-sm font-medium">Shelf / location <span className="font-normal text-slate-500">(optional)</span></span>
                <select value={shelfLocationId} onChange={(e) => setShelfLocationId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                  <option value="">No shelf / location</option>
                  {locations.map((location) => (
                    <option key={location.location_id} value={location.location_id}>{location.location_name}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500">Locations are shared only within this SME.</span>
              </label>
              <button
                type="button"
                onClick={() => setShowLocationCreate((current) => !current)}
                className="mt-2 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                {showLocationCreate ? "Cancel" : "+ Create new shelf/location"}
              </button>
              {showLocationCreate ? (
                <form onSubmit={addLocation} className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Shelf, aisle, bin, cabinet..."
                    required
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  />
                  <button className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:bg-white">Create</button>
                </form>
              ) : null}
            </div>

            <label className="block">
              <span className="text-sm font-medium">Reorder level</span>
              <input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} type="number" min="0" step="1" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">Leave blank to use 0.</span>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Opening stock</span>
              <input value={initialStock} onChange={(e) => setInitialStock(e.target.value)} type="number" min="0" step="1" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">Leave blank to start at 0; a positive amount is recorded as initial stock.</span>
            </label>

            <label className="block">
              <span className="text-sm font-medium">QR code / binding <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <span className="mt-1 block text-xs text-slate-500">Manual binding value for now; camera scanning is not implemented yet.</span>
            </label>
          </div>

          {error ? <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
          {message ? <p className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

          <button type="submit" disabled={creating} className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 sm:w-auto">
            {creating ? "Creating..." : "Create item"}
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Current catalog</h2>
          <p className="mt-1 text-sm text-slate-500">Items can appear in multiple categories and optionally carry a defined shelf/location.</p>
        </div>

        <div className="divide-y divide-slate-800">
          {items.map((item) => (
            <article key={item.item_id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{item.brand ? item.brand + " · " : ""}{item.product_name}</p>

                {item.category_names.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.category_names.map((name) => (
                      <span key={name} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{name}</span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-2 text-sm text-slate-400">
                  {item.current_price.toLocaleString("en-PH", { style: "currency", currency: "PHP" })} · {item.stock_qty} in stock · reorder {item.reorder_level}
                </p>

                {item.shelf_location ? (
                  <p className="mt-1 text-xs text-slate-500">Location: {item.shelf_location}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{item.status}</span>
                {item.status === "ACTIVE" && role !== "STAFF" ? (
                  editingPriceId === item.item_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editingPrice}
                        onChange={(event) => setEditingPrice(event.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => changePrice(item.item_id)}
                        disabled={priceSaving}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-slate-950 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceId(null);
                          setEditingPrice("");
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceId(item.item_id);
                          setEditingPrice(String(item.current_price));
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
                      >
                        Change price
                      </button>
                      {role === "OWNER" ? (
                        <button
                          type="button"
                          onClick={() => archive(item.item_id)}
                          className="rounded-lg border border-red-900 px-3 py-1.5 text-red-300 hover:bg-red-950/40"
                        >
                          Archive
                        </button>
                      ) : null}
                    </>
                  )
                ) : null}
              </div>
            </article>
          ))}

          {items.length === 0 ? <p className="p-6 text-sm text-slate-500">No items yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
