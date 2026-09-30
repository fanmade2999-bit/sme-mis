import { withSupabase } from "npm:@supabase/server@^1";

type StaffRole = "MANAGER" | "STAFF";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const userId = ctx.userClaims?.sub;
    const { data: actor, error: actorError } = await ctx.supabase
      .from("staff_account")
      .select("account_id, sme_id, role, is_active")
      .eq("auth_user_id", userId ?? "")
      .maybeSingle();

    if (actorError || !actor || !actor.is_active) {
      return Response.json({ error: "Active SME account required" }, { status: 403 });
    }

    if (actor.role !== "OWNER") {
      return Response.json({ error: "Only Owner may invite staff" }, { status: 403 });
    }

    let body: { email?: string; full_name?: string; role?: StaffRole };

    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    const role = body.role;

    if (!email || !fullName || !role || !["MANAGER", "STAFF"].includes(role)) {
      return Response.json(
        { error: "email, full_name, and role (MANAGER or STAFF) are required" },
        { status: 400 },
      );
    }

    const { data: users, error: usersError } = await ctx.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      return Response.json({ error: usersError.message }, { status: 500 });
    }

    const existingUser = users.users.find(
      (user) => user.email?.toLowerCase() === email,
    );

    if (existingUser) {
      return Response.json(
        { error: "This email already has a Supabase Auth account. Use a different email for a new staff invitation." },
        { status: 409 },
      );
    }

    const redirectTo = new URL(
      "/auth/confirm?type=invite",
      new URL(req.url).origin,
    ).toString();

    const { data: invited, error: inviteError } =
      await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo,
      });

    if (inviteError || !invited.user) {
      return Response.json(
        { error: inviteError?.message ?? "Unable to create invitation" },
        { status: 400 },
      );
    }

    const { data: account, error: accountError } = await ctx.supabaseAdmin
      .from("staff_account")
      .insert({
        sme_id: actor.sme_id,
        auth_user_id: invited.user.id,
        full_name: fullName,
        role,
        created_by_account_id: actor.account_id,
      })
      .select("account_id, sme_id, full_name, role, is_active, created_at")
      .single();

    if (accountError) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      return Response.json({ error: accountError.message }, { status: 400 });
    }

    return Response.json({ account });
  }),
};
