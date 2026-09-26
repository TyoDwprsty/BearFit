import { AppShell } from "@/components/shell/AppShell";
import { requireViewer } from "@/lib/auth";

/** Pages available in both modes (profile, notifications). The nav follows the active role. */
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const { profile } = viewer;
  const mode = profile.active_role ?? (profile.is_member ? "member" : "coach");
  return (
    <AppShell viewer={viewer} mode={mode}>
      {children}
    </AppShell>
  );
}
