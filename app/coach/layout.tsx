import { AppShell } from "@/components/shell/AppShell";
import { requireViewer } from "@/lib/auth";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("coach");
  return (
    <AppShell viewer={viewer} mode="coach">
      {children}
    </AppShell>
  );
}
