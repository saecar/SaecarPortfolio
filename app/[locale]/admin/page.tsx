import { getServerSession } from "next-auth";
import { Metadata } from "next";
import Container from "@/common/components/elements/Container";
import { authOptions } from "@/common/libs/auth";
import { isAdminEmail } from "@/common/libs/admin-auth";
import AdminDashboard from "@/modules/admin/components/AdminDashboard";
import AdminLogin from "@/modules/admin/components/AdminLogin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard - Project Management",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return (
      <Container>
        <AdminLogin />
      </Container>
    );
  }

  const isAllowed = isAdminEmail(session.user.email);
  if (!isAllowed) {
    return (
      <Container>
        <AdminLogin isForbidden={true} email={session.user.email} />
      </Container>
    );
  }

  return (
    <Container>
      <AdminDashboard userEmail={session.user.email} />
    </Container>
  );
}
