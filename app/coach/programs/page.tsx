import Link from "next/link";
import { createProgram } from "@/app/actions/coach";
import { SubmitButton } from "@/components/feedback/SubmitButton";
import { ProgramLengthField } from "@/components/coach/ProgramLengthField";
import { Icon } from "@/components/Icon";
import { btn, Card, cn, EmptyState, input, PageTitle } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { makeT } from "@/lib/i18n";
import type { Program } from "@/lib/types";

export const metadata = { title: "Program" };

export default async function ProgramsPage() {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);

  const [{ data: programs }, { data: items }, { data: assigned }] = await Promise.all([
    supabase.from("programs").select("*").eq("coach_id", userId).order("created_at", { ascending: false }),
    supabase.from("program_items").select("program_id, programs!inner(coach_id)").eq("programs.coach_id", userId),
    supabase.from("member_programs").select("program_id").eq("coach_id", userId).eq("active", true),
  ]);
  const count = (list: { program_id: string }[] | null, id: string) => (list ?? []).filter((x) => x.program_id === id).length;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        eyebrow={t("programs.subtitle")}
        title={t("programs.title")}
        actions={
          <Link href="/coach/exercises" className={cn(btn.small, "border border-line")}>
            <Icon name="workout" size={16} />
            <span className="hidden sm:inline">{t("programs.catalogLink")}</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-2.5">
          {(programs ?? []).length === 0 ? (
            <EmptyState pose="lift" text={t("programs.empty")} />
          ) : (
            ((programs ?? []) as Program[]).map((p) => (
              <Link key={p.id} href={`/coach/programs/${p.id}`} className="flex items-center gap-3 rounded-[22px] border border-line bg-card p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grape text-on-grape">
                  <Icon name="program" size={22} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-extrabold">{p.name}</span>
                  <span className="text-xs font-semibold text-muted">
                    {p.weeks ? t("programs.weeksN", { n: p.weeks }) : t("programs.forever")} · {t("programs.exercisesN", { n: count(items as { program_id: string }[], p.id) })} ·{" "}
                    {t("programs.assignedN", { n: count(assigned, p.id) })}
                  </span>
                </span>
                <Icon name="chevron" size={18} className="text-muted" />
              </Link>
            ))
          )}
        </div>

        <Card className="flex flex-col gap-3 lg:sticky lg:top-10">
          <h2 className="font-display text-[19px] font-semibold">{t("programs.new")}</h2>
          <form action={createProgram} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">{t("programs.name")}</span>
              <input name="name" required maxLength={80} placeholder={t("programs.namePh")} className={input} />
            </label>
            <ProgramLengthField defaultWeeks={8} />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">
                {t("programs.desc")} <span className="font-medium text-muted">({t("common.optional")})</span>
              </span>
              <textarea name="description" rows={2} maxLength={400} className={cn(input, "resize-none")} />
            </label>
            <SubmitButton page className={cn(btn.primary, "h-12 text-base")}>
              <Icon name="plus" size={18} />
              {t("programs.new")}
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
