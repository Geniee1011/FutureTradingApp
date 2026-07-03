import { AuthGuard } from "@/components/auth/AuthGuard";
import { TraderProvider } from "@/components/providers/TraderProvider";
import { TopNav } from "@/components/layout/TopNav";
import { ProfitTargetModal } from "@/components/account/ProfitTargetModal";

/** Shared chrome for the trader portal. Traders only — admins are bounced to the
 *  Admin CRM. (Admin users have no trading account, so the portal would 401 on
 *  every API call and fall back to demo data; keeping the areas separate avoids that.) */
export default function TraderLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="trader">
      <TraderProvider>
        <div className="min-h-screen bg-background">
          <TopNav />
          <main className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">{children}</main>
          <ProfitTargetModal />
        </div>
      </TraderProvider>
    </AuthGuard>
  );
}
