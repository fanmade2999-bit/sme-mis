export default function Home() {
  return (
    <main className="min-h-svh flex items-center justify-center p-6">
      <section className="w-full max-w-2xl space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Project foundation</p>
        <h1 className="text-3xl font-semibold tracking-tight">SME: MIS with Price and Stock Control</h1>
        <p className="max-w-xl text-muted-foreground">
          Clean Next.js + Supabase foundation. The database, security model, transactions,
          and analytics are being built first; application screens will be derived from the approved system design.
        </p>
      </section>
    </main>
  );
}
