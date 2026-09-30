import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

type StaffRole = "MANAGER" | "STAFF";

// Where invited users land after clicking the email link. Set the SITE_URL secret to
// override; otherwise the production domain is used. Never derive this from the request.
const DEFAULT_SITE_URL = "https://sme-mis.vercel.app";

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getDefaultKey(raw: string | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default ?? null;
  } catch {
    return null;
  }
}

function getSiteUrl() {
  const raw = Deno.env.get("SITE_URL") ?? DEFAULT_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey =
      getDefaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) ??
      Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey =
      getDefaultKey(Deno.env.get("SUPABASE_SECRET_KEYS")) ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !publishableKey || !secretKey) {
      console.error("[invite-staff] Supabase key configuration missing");
      return response({ error: "Server authentication configuration is incomplete." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return response({ error: "Authentication required" }, 401);
    }

    const accessToken = authHeader.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return response({ error: "Authentication required" }, 401);
    }

    const { data: actor, error: actorError } = await userClient
      .from("staff_account")
      .select("account_id, sme_id, role, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (actorError) {
      console.error("[invite-staff] actor lookup failed", {
        code: actorError.code,
        message: actorError.message,
      });
      return response({ error: "Unable to verify Owner access." }, 500);
    }

    if (!actor || !actor.is_active) {
      return response({ error: "Active SME account required" }, 403);
    }

    if (actor.role !== "OWNER") {
      return response({ error: "Only Owner may invite staff" }, 403);
    }

    let body: {
      email?: string;
      first_name?: string;
      middle_name?: string | null;
      last_name?: string | null;
      name_suffix?: string | null;
      role?: StaffRole;
    };

    try {
      body = await req.json();
    } catch {
      return response({ error: "Invalid JSON body" }, 400);
    }

    const email = body.email?.trim().toLowerCase();
    const firstName = body.first_name?.trim();
    const middleName = body.middle_name?.trim() || null;
    const lastName = body.last_name?.trim() || null;
    const nameSuffix = body.name_suffix?.trim() || null;
    const role = body.role;

    if (
      !email ||
      !firstName ||
      !role ||
      !["MANAGER", "STAFF"].includes(role)
    ) {
      return response(
        { error: "email, first_name, and role (MANAGER or STAFF) are required" },
        400,
      );
    }

    const admin = createClient(supabaseUrl, secretKey);

    // Page through Auth users so the duplicate-email check still works past 1000 accounts.
    const perPage = 1000;
    let existingUser: { id: string; email?: string } | undefined;
    for (let page = 1; page <= 20 && !existingUser; page++) {
      const { data: users, error: usersError } =
        await admin.auth.admin.listUsers({ page, perPage });

      if (usersError) {
        console.error("[invite-staff] auth user lookup failed", {
          code: usersError.name,
          message: usersError.message,
        });
        return response({ error: "Unable to check existing Auth accounts." }, 500);
      }

      existingUser = users.users.find(
        (candidate) => candidate.email?.toLowerCase() === email,
      );

      if (users.users.length < perPage) break;
    }

    if (existingUser) {
      const { data: existingStaff, error: existingStaffError } = await admin
        .from("staff_account")
        .select("account_id, sme_id, role, is_active")
        .eq("auth_user_id", existingUser.id)
        .maybeSingle();

      if (existingStaffError) {
        return response({ error: existingStaffError.message }, 500);
      }

      if (existingStaff?.sme_id === actor.sme_id && existingStaff?.is_active === false) {
        return response({
          error: "That email belongs to a previously revoked staff account. Use Restore access in Staff accounts instead.",
        }, 409);
      }

      return response(
        {
          error:
            "This email already has a Supabase Auth account. Use a different email for a new staff invitation.",
        },
        409,
      );
    }

    const redirectTo = new URL("/auth/confirm?type=invite", getSiteUrl()).toString();

    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          name_suffix: nameSuffix,
        },
        redirectTo,
      });

    if (inviteError || !invited.user) {
      console.error("[invite-staff] invitation failed", {
        message: inviteError?.message,
      });
      return response(
        { error: inviteError?.message ?? "Unable to create invitation" },
        400,
      );
    }

    const { data: account, error: accountError } = await admin
      .from("staff_account")
      .insert({
        sme_id: actor.sme_id,
        auth_user_id: invited.user.id,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        name_suffix: nameSuffix,
        role,
        created_by_account_id: actor.account_id,
      })
      .select(
        "account_id, sme_id, first_name, middle_name, last_name, name_suffix, role, is_active, created_at",
      )
      .single();

    if (accountError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      console.error("[invite-staff] staff account insert failed", {
        code: accountError.code,
        message: accountError.message,
      });
      return response({ error: accountError.message }, 400);
    }

    return response({ account });
  } catch (error) {
    console.error("[invite-staff] unhandled error", error);
    return response({ error: "Unexpected server error while sending invitation." }, 500);
  }
});
