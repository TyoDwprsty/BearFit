import Link from "next/link";
import { notFound } from "next/navigation";
import { assignProgramToMember, deleteProgram, unassignProgram, updateProgram } from "@/app/actions/coach";
import { ProgramDayPicker } from "@/components/coach/ProgramDayPicker";
import { ProgramLengthField } from "@/components/coach/ProgramLengthField";
import { DateField } from "@/components/DateField";
import { ConfirmActionButton } from "@/components/feedback/ConfirmActionButton";
import { SubmitButton } from "@/components/feedback/SubmitButton";
import { Icon } from "@/components/Icon";
import { Avatar, BackHeader, btn, Card, cn, input } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getCoachMembers } from "@/lib/coach";
import { formatShortDate, todayIn } from "@/lib/dates";
import { getExerciseCatalog } from "@/lib/data";
import { makeT, type DictKey } from "@/lib/i18n";
import type { MemberProgram, Program, ProgramItem } from "@/lib/types";

export const metadata = { title: "Program" };

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function ProgramEditPage({ params, searchParams }: PageProps<"/coach/programs/[id]">) {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const { id } = await params;
  const sp = await searchParams;
  const day = DAY_ORDER.includes(Number(sp.day)) && sp.day !== undefined ? Number(sp.day) : 1;

  const { data: program } = await supabase.from("programs").select("*").eq("id", id).eq("coach_id", userId).maybeSingle<Program>();
  if (!program) notFound();

  const [{ data: items }, catalog, members, { data: assignedRows }] = await Promise.all([
    supabase.from("program_items").select("*").eq("program_id", id).order("position"),
    getExerciseCatalog(supabase),
    getCoachMembers(supabase, userId),
    supabase.from("member_programs").select("*").eq("program_id", id).eq("active", true),
  ]);
  const assigned = (assignedRows ?? []) as MemberProgram[];
  const assignedIds = new Set(assigned.map((a) => a.member_id));
  const available = members.filter((m) => !assignedIds.has(m.id));
  const all = (items ?? []) as ProgramItem[];
  const perDay = (d: number) => all.filter((i) => i.day_of_week === d);

  return (
    <div className="flex flex-col gap-4">
      <BackHeader href="/coach/programs" backLabel={t("common.back")} title={program.name} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_ORDER.map((d) => {
              const n = perDay(d).length;
              const on = d === day;
              return (
                <Link
                  key={d}
                  href={`/coach/programs/${id}?day=${d}`}
                  replace
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "flex h-[62px] flex-col items-center justify-center gap-0.5 rounded-[18px] border",
                    on ? "border-grape bg-grape text-on-grape" : "border-line bg-card",
                  )}
                >
                  <span className="text-xs font-bold">{t(`weekday.${d}` as DictKey)}</span>
                  <span className={cn("font-display text-lg font-semibold", !on && !n && "text-muted")}>{n}</span>
                </Link>
              );
            })}
          </div>
          <ProgramDayPicker key={day} programId={id} day={day} catalog={catalog} selectedIds={perDay(day).map((i) => i.exercise_id)} />
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-10">
          <Card className="flex flex-col gap-3">
            <form action={updateProgram.bind(null, id)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">{t("programs.name")}</span>
                <input name="name" defaultValue={program.name} required maxLength={80} className={input} />
              </label>
              <ProgramLengthField defaultWeeks={program.weeks} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">{t("programs.desc")}</span>
                <textarea name="description" rows={2} maxLength={400} defaultValue={program.description ?? ""} className={cn(input, "resize-none")} />
              </label>
              <SubmitButton className={cn(btn.primary, "h-12 text-base")}>
                {t("common.save")}
              </SubmitButton>
            </form>
            <ConfirmActionButton
              action={deleteProgram.bind(null, id)}
              title={t("programs.deleteConfirm")}
              confirmLabel={t("common.delete")}
              pose="lift"
              className={cn(btn.ghost, "w-full text-berry-d")}
            >
              <Icon name="trash" size={16} />
              {t("programs.delete")}
            </ConfirmActionButton>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-display text-[19px] font-semibold">{t("programs.assignTitle")}</h2>
              <p className="text-[13px] leading-snug text-muted">{t("programs.assignBody")}</p>
            </div>
            {assigned.length > 0 && (
              <ul className="flex flex-col gap-2">
                {assigned.map((a) => {
                  const m = members.find((x) => x.id === a.member_id);
                  return (
                    <li key={a.id} className="flex items-center gap-2.5 rounded-2xl bg-grape-s p-2.5">
                      <Avatar name={m?.full_name} src={m?.avatar_url} id={a.member_id} size={36} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-bold">{m?.full_name ?? "—"}</span>
                        <span className="text-xs text-muted">{t("programs.startedOn", { date: formatShortDate(a.start_date, profile.locale) })}</span>
                      </span>
                      <ConfirmActionButton
                        action={unassignProgram.bind(null, a.member_id)}
                        title={t("coach.unassignConfirm")}
                        confirmLabel={t("coach.unassign")}
                        className={cn(btn.ghost, "text-berry-d")}
                      >
                        {t("coach.unassign")}
                      </ConfirmActionButton>
                    </li>
                  );
                })}
              </ul>
            )}
            {available.length > 0 ? (
              <form action={assignProgramToMember.bind(null, id)} className="flex flex-col gap-2">
                <select name="member_id" required className={input} defaultValue="">
                  <option value="" disabled>
                    {t("programs.pickMember")}
                  </option>
                  {available.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-line bg-card px-4 py-2">
                  <span className="text-sm font-bold">{t("coach.startDate")}</span>
                  <DateField name="start_date" defaultValue={todayIn(profile.timezone)} label={t("coach.startDate")} className="min-h-9 text-sm font-bold" />
                </div>
                <SubmitButton className={cn(btn.primary, "h-12 text-base")}>
                  <Icon name="members" size={18} />
                  {t("coach.assign")}
                </SubmitButton>
              </form>
            ) : (
              members.length === 0 && <p className="text-sm text-muted">{t("coach.noMembers")}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
