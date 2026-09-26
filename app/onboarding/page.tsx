import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  if (viewer.profile.onboarded) redirect(homeFor(viewer.profile));

  const params = await searchParams;
  const role = params.role === "coach" ? "coach" : params.role === "member" ? "member" : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-8 pb-12">
      <OnboardingForm
        defaultName={viewer.profile.full_name}
        defaultRole={role}
        next={next}
        locale={viewer.profile.locale}
      />
    </main>
  );
}
