import { AppShell } from "@/components/shell/AppShell";
import { requireViewer } from "@/lib/auth";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("member");
  return (
    <AppShell viewer={viewer} mode="member">
      {children}
    </AppShell>
  );
}
