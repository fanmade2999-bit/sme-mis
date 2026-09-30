import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithSession(
  request: NextRequest,
  response: NextResponse,
  path: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));

  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const pathname = request.nextUrl.pathname;
  const needsAuth = pathname.startsWith("/dashboard") || pathname.startsWith("/setup");

  if (needsAuth && !userId) {
    return redirectWithSession(request, response, "/auth/login");
  }

  if (needsAuth && userId) {
    const { data: account } = await supabase
      .from("staff_account")
      .select("account_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (pathname.startsWith("/dashboard") && !account) {
      return redirectWithSession(request, response, "/setup");
    }

    if (pathname.startsWith("/setup") && account) {
      return redirectWithSession(request, response, "/dashboard");
    }
  }

  return response;
}
