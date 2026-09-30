export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PriceRow = {
  product_id: string;
  brand: string | null;
  product_name: string;
  variant: string | null;
  package_size_value: number | null;
  package_size_unit: string | null;
  sme_id: string;
  business_name: string;
  current_price: number;
  public_min_price: number;
  public_max_price: number;
  public_listing_count: number;
  price_updated_at: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export default async function PublicPricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const supabase = await createClient();

  const result = await supabase
    .from("v_public_price_position")
    .select("product_id,brand,product_name,variant,package_size_value,package_size_unit,sme_id,business_name,current_price,price_updated_at,public_min_price,public_max_price,public_listing_count")
    .ilike("product_name", "%" + query + "%")
    .order("product_name")
    .order("current_price");

  const { data, error } = result;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-400">SME MIS</p>
            <h1 className="mt-1 text-3xl font-semibold">Public price comparison</h1>
            <p className="mt-2 text-sm text-slate-400">Compare currently published prices from participating SMEs.</p>
          </div>
          <Link href="/auth/login" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">SME sign in</Link>
        </header>

        <form action="/prices" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input name="q" defaultValue={query} placeholder="Search product name" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none ring-emerald-500 focus:ring-2" />
          <button className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">Search</button>
        </form>

        {error ? <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">Unable to load public prices right now.</div> : null}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="font-semibold">{query ? "Results for \"" + query + "\"" : "Published products"}</h2>
          </div>

          <div className="divide-y divide-slate-800">
            {(data as PriceRow[] | null)?.map((row) => (
              <article key={row.sme_id + row.product_id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                <div>
                  <p className="font-medium">{row.brand ? row.brand + " · " : ""}{row.product_name}{row.variant ? " · " + row.variant : ""}</p>
                  <p className="mt-1 text-sm text-slate-400">{row.package_size_value ? row.package_size_value + " " + (row.package_size_unit ?? "") : "Standard size"}</p>
                  <p className="mt-2 text-xs text-slate-500">{row.business_name}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Price</p>
                  <p className="mt-1 text-lg font-semibold">{money(Number(row.current_price))}</p>
                </div>

                <div className="text-sm text-slate-400">
                  <p>Public range</p>
                  <p className="mt-1">{money(Number(row.public_min_price))} – {money(Number(row.public_max_price))}</p>
                  <p className="mt-1 text-xs text-slate-500">{Number(row.public_listing_count)} published listing{Number(row.public_listing_count) === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Updated {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.price_updated_at))}
                  </p>
                </div>
              </article>
            ))}

            {(!data || data.length === 0) && !error ? <p className="p-6 text-sm text-slate-500">No published products match that search.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
