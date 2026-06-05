import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";

/** Landing route: bounce to the right home based on the session cookie. */
export default async function Home() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  const role = session?.split(":")[1];

  if (!session) redirect("/login");
  redirect(role === "admin" ? "/admin/traders" : "/dashboard");
}
