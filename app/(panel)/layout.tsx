import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAdminConfigured, readAdminConfig, sessionToken } from "@/agent/admin";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for every panel route (everything inside the (panel)
 * route group). Unauthenticated visitors — including when admin.json is
 * still empty — are sent to /login before any page code runs.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const config = await readAdminConfig();
  const store = await cookies();

  const authenticated =
    isAdminConfigured(config) && store.get(ADMIN_COOKIE)?.value === sessionToken(config);

  if (!authenticated) redirect("/login");

  return <>{children}</>;
}
