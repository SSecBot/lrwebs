import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { isAuthenticated } from "@/lib/auth";
import { getCms, getMessages } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cms = await getCms();
  if (!(await isAuthenticated())) {
    return <AdminLogin brandName={cms.general.brandName} />;
  }
  const messages = await getMessages();
  return <AdminDashboard initialStore={cms} initialMessages={messages} />;
}
