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

const MOVEMENT_HELP: Record<Movement, string> = {
  SALE: "Record units sold to a customer. Stock decreases and the current selling price (and cost, when available) is snapshotted for analytics.",
  RESTOCK: "Record stock that arrived or was added to inventory. Stock increases.",
  LOSS: "Record stock that was lost for a reason such as damage, theft, or an unexplained shortage. Stock decreases.",
  SPOILAGE: "Record stock that can no longer be sold because it expired, spoiled, or became unusable. Stock decreases.",
  CORRECTION: "Fix a stock-count discrepancy found during a physical count. Choose Increase or Decrease and give a reason.",
};

function getDelta(movement: Movement, quantity: number, direction: Direction) {
  if (movement === "RESTOCK") return quantity;
  if (movement === "CORRECTION") return direction === "INCREASE" ? quantity : -quantity;
  return -quantity;
}

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
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<Direction>("DECREASE");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedItem = items.find((item) => item.item_id === itemId);
  const parsedPreviewQuantity = Number.parseInt(quantity, 10);
  const previewDelta =
    Number.isInteger(parsedPreviewQuantity) && parsedPreviewQuantity > 0
      ? getDelta(movement, parsedPreviewQuantity, direction)
      : 0;
  const previewStock =
    selectedItem && previewDelta !== 0 ? selectedItem.stock_qty + previewDelta : selectedItem?.stock_qty ?? 0;

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setMessage("");
    setLoading(true);

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!itemId || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Select an item and enter a whole-number quantity greater than zero.");
      setLoading(false);
      return;
    }

    if (movement !== "SALE" && !reason.trim()) {
      setError("A reason is required for non-sale movements.");
      setLoading(false);
      return;
    }

    if (
      movement !== "RESTOCK" &&
      movement !== "CORRECTION" &&
      selectedItem &&
      parsedQuantity > selectedItem.stock_qty
    ) {
      setError("The deduction is greater than the current stock.");
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

    setMessage(
      movement === "SALE"
        ? "Sale recorded and stock deducted."
        : "Stock movement recorded and inventory updated.",
    );
    setReason("");
    setQuantity("");
    setLoading(false);
    router.refresh();

    const delta = getDelta(movement, parsedQuantity, direction);
    setItems((current) =>
      current.map((item) =>
        item.item_id === itemId
          ? { ...item, stock_qty: item.stock_qty + delta }
          : item,
      ),
    );
  }

  const availableMovements: Movement[] =
    role === "STAFF"
      ? ["SALE"]
      : ["SALE", "RESTOCK", "LOSS", "SPOILAGE", "CORRECTION"];

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
      <form onSubmit={record} className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Record stock movement</h2>
        <p className="mt-1 text-sm text-slate-400">
          This records the stock change in the audit trail and updates the item quantity atomically.
          The system automatically records the logged-in staff account as the actor.
        </p>

        <label className="mt-5 block space-y-2">
          <span className="text-sm font-medium">Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            {items.map((item) => (
              <option key={item.item_id} value={item.item_id}>
                {item.brand ? item.brand + " · " : ""}{item.product_name} — {item.stock_qty} in stock
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium">What happened?</span>
          <select value={movement} onChange={(e) => setMovement(e.target.value as Movement)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
            {availableMovements.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <span className="block text-xs leading-5 text-slate-500">{MOVEMENT_HELP[movement]}</span>
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium">Quantity</span>
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="1" step="1" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          <span className="block text-xs text-slate-500">Enter the number of units affected by this event.</span>
        </label>

        {movement === "CORRECTION" ? (
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium">Correction direction</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <option value="INCREASE">Increase stock</option>
              <option value="DECREASE">Decrease stock</option>
            </select>
            <span className="block text-xs text-slate-500">Use this only when the physical count differs from the recorded quantity.</span>
          </label>
        ) : null}

        {movement !== "SALE" ? (
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium">Reason</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required placeholder="For example: physical count found 2 extra units" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </label>
        ) : null}

        {selectedItem && Number.isInteger(parsedPreviewQuantity) && parsedPreviewQuantity > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm">
            <p className="text-slate-400">Stock preview</p>
            <p className="mt-1 font-medium">
              {selectedItem.stock_qty} → {previewStock} units
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">{message}</p> : null}

        <button type="submit" disabled={loading || items.length === 0} className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
          {loading ? "Recording..." : "Record movement"}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Inventory</h2>
          <p className="mt-1 text-sm text-slate-500">Current stock after recorded movements. Every entry keeps the staff actor and timestamp for the audit trail.</p>
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
