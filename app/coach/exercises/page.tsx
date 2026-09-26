import { DeleteExerciseButton, ExerciseForm } from "@/components/coach/ExerciseForm";
import { CATEGORY_ICON, Icon } from "@/components/Icon";
import { TutorialButton } from "@/components/workout/TutorialButton";
import { BackHeader, Card, cn, SOLID } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getExerciseCatalog } from "@/lib/data";
import { exerciseMeta, exerciseName } from "@/lib/format";
import { makeT, type DictKey } from "@/lib/i18n";
import type { Exercise } from "@/lib/types";

export const metadata = { title: "Katalog Latihan" };

const TILE = { cardio: SOLID.mango, strength: SOLID.grape, flexibility: SOLID.mint } as const;

export default async function ExercisesPage() {
  const viewer = await requireViewer("coach");
  const { supabase, userId, profile } = viewer;
  const t = makeT(profile.locale);
  const catalog = await getExerciseCatalog(supabase);
  const mine = catalog.filter((x) => x.created_by === userId);
  const builtin = catalog.filter((x) => x.created_by === null);

  const row = (x: Exercise, deletable: boolean) => (
    <li key={x.id} className="flex items-center gap-3 rounded-[20px] border border-line bg-card p-3">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TILE[x.category])}>
        <Icon name={CATEGORY_ICON[x.category]} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-bold">{exerciseName(x, profile.locale)}</span>
        <span className="text-xs text-muted">
          {t(`cat.${x.category}` as DictKey)} · {exerciseMeta(x, t)} · {t(`int.${x.intensity}` as DictKey)}
        </span>
        {x.video_url && <TutorialButton url={x.video_url} title={exerciseName(x, profile.locale)} className="mt-1 self-start" />}
      </span>
      {deletable && <DeleteExerciseButton id={x.id} name={exerciseName(x, profile.locale)} />}
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <BackHeader href="/coach/programs" backLabel={t("common.back")} title={t("exercises.title")} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2.5">
            <h2 className="font-display text-[19px] font-semibold">{t("exercises.mine")}</h2>
            {mine.length === 0 ? <p className="text-sm text-muted">{t("exercises.empty")}</p> : <ul className="flex flex-col gap-2">{mine.map((x) => row(x, true))}</ul>}
          </section>
          <section className="flex flex-col gap-2.5">
            <h2 className="font-display text-[19px] font-semibold">{t("exercises.builtin")}</h2>
            <ul className="grid gap-2 xl:grid-cols-2">{builtin.map((x) => row(x, false))}</ul>
          </section>
        </div>
        <Card className="flex flex-col gap-3 lg:sticky lg:top-10">
          <h2 className="font-display text-[19px] font-semibold">{t("exercises.new")}</h2>
          <ExerciseForm />
        </Card>
      </div>
    </div>
  );
}
