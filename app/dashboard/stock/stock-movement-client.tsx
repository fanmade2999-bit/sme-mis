"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "OWNER" | "MANAGER" | "STAFF";
type Movement = "SALE" | "RESTOCK" | "LOSS" | "SPOILAGE" | "CORRECTION";
type Direction = "INCREASE" | "DECREASE";

type Item = {
  item_id: string;
  product_name: string;
  brand: string | null;
  current_price: number;
  stock_qty: number;
  reorder_level: number;
  status: string;
};

export function StockMovementClient({
  role,
  initialItems,
}: {
  role: Role;
  initialItems: Item[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [itemId, setItemId] = useState(initialItems[0]?.item_id ?? "");
  const [movement, setMovement] = useState<Movement>("SALE");
  const [quantity, setQuantity] = useState("1");
  const [direction, setDirection] = useState<Direction>("INCREASE");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");
    setLoading(true);

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!itemId || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Select an item and enter a quantity greater than zero.");
      setLoading(false);
      return;
    }

    if (movement !== "SALE" && !reason.trim()) {
      setError("A reason is required for non-sale movements.");
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("record_stock_movement", {
      p_item_id: itemId,
      p_movement_type: movement,
      p_quantity: parsedQuantity,
      p_correction_direction: movement === "CORRECTION" ? direction : null,
      p_reason: movement === "SALE" ? null : reason.trim(),
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setMessage("Stock movement recorded.");
    setReason("");
    setQuantity("1");
    setLoading(false);
    router.refresh();

    setItems((current) =>
      current.map((item) => {
        if (item.item_id !== itemId) return item;
        const delta =
          movement === "RESTOCK" || (movement === "CORRECTION" && direction === "INCREASE")
            ? parsedQuantity
            : -parsedQuantity;
        return { ...item, stock_qty: Math.max(0, item.stock_qty + delta) };
      }),
    );
  }

  const availableMovements: Movement[] = role === "STAFF"
    ? ["SALE"]
    : ["SALE", "RESTOCK", "LOSS", "SPOILAGE", "CORRECTION"];

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <form onSubmit={record} className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Record movement</h2>
        <p className="mt-1 text-sm text-slate-400">Role: {role}</p>

        <label className="mt-5 block space-y-2">
          <span className="text-sm font-medium">Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            {items.map((item) => (
              <option key={item.item_id} value={item.item_id}>
                {item.brand ? item.brand + " · " : ""}{item.product_name} ({item.stock_qty})
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium">Movement</span>
          <select value={movement} onChange={(e) => setMovement(e.target.value as Movement)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            {availableMovements.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium">Quantity</span>
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="1" step="1" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
        </label>

        {movement === "CORRECTION" ? (
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium">Correction direction</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <option value="INCREASE">Increase</option>
              <option value="DECREASE">Decrease</option>
            </select>
          </label>
        ) : null}

        {movement !== "SALE" ? (
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium">Reason</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
        ) : null}

        {error ? <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

        <button type="submit" disabled={loading || items.length === 0} className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
          {loading ? "Recording..." : "Record movement"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <h2 className="text-lg font-semibold">Inventory</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {items.map((item) => (
            <article key={item.item_id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{item.brand ? item.brand + " · " : ""}{item.product_name}</p>
                <p className="mt-1 text-sm text-slate-400">Price {item.current_price.toLocaleString("en-PH", { style: "currency", currency: "PHP" })} · reorder {item.reorder_level}</p>
              </div>
              <div className={item.stock_qty <= item.reorder_level ? "text-amber-300" : "text-slate-200"}>
                {item.stock_qty} units
              </div>
            </article>
          ))}
          {items.length === 0 ? <p className="p-6 text-sm text-slate-500">Create an item in Catalog first.</p> : null}
        </div>
      </section>
    </div>
  );
}
