import { AuthGuard } from "@/components/auth/AuthGuard";
import { TraderProvider } from "@/components/providers/TraderProvider";
import { TopNav } from "@/components/layout/TopNav";

/** Shared chrome for the trader portal (any authenticated user). */
export default function TraderLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TraderProvider>
        <div className="min-h-screen bg-background">
          <TopNav />
          <main className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">{children}</main>
        </div>
      </TraderProvider>
    </AuthGuard>
  );
}
