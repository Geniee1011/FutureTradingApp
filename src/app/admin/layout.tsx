import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminProvider } from "@/components/providers/AdminProvider";
import { AdminShell } from "@/components/layout/AdminSidebar";

/** Admin CRM chrome. Requires the admin role (also enforced in middleware). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="admin">
      <AdminProvider>
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </AuthGuard>
  );
}
