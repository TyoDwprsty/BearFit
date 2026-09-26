export type Role = "member" | "coach";
export type Locale = "id" | "en";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Portion = "small" | "medium" | "large";
export type ExerciseCategory = "cardio" | "strength" | "flexibility";
export type Intensity = "light" | "medium" | "hard";
export type LinkStatus = "pending" | "active" | "rejected" | "ended";
export type ReminderKind = "workout" | "water" | "meal" | "stretch" | "recap" | "custom";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  is_member: boolean;
  is_coach: boolean;
  active_role: Role | null;
  onboarded: boolean;
  locale: Locale;
  timezone: string;
  coach_code: string | null;
  coach_bio: string | null;
  height_cm: number | null;
  alarm_vibrate: boolean;
  alarm_snooze_min: number;
  alarm_tone: string;
  created_at: string;
}

export type ProfileLite = Pick<Profile, "id" | "full_name" | "avatar_url">;

export interface Targets {
  user_id: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  workout_min: number;
  water_glasses: number;
  meals: number;
  target_weight_kg: number | null;
}

export interface CoachLink {
  id: string;
  coach_id: string;
  member_id: string;
  status: LinkStatus;
  initiated_by: Role;
  created_at: string;
  responded_at: string | null;
}

export interface Exercise {
  id: string;
  slug: string | null;
  name_id: string;
  name_en: string;
  category: ExerciseCategory;
  intensity: Intensity;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  minutes: number;
  video_url: string | null;
  created_by: string | null;
}

export interface WorkoutPlan {
  id: string;
  member_id: string;
  plan_date: string;
  source: "member" | "coach" | "program";
  note: string | null;
  created_by: string | null;
}

export interface WorkoutItem {
  id: string;
  plan_id: string;
  exercise_id: string | null;
  name_id: string;
  name_en: string;
  category: ExerciseCategory;
  intensity: Intensity;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  minutes: number;
  position: number;
  done_at: string | null;
  added_by: string | null;
}

export interface Program {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  weeks: number;
  created_at: string;
}

export interface ProgramItem {
  id: string;
  program_id: string;
  day_of_week: number;
  exercise_id: string;
  position: number;
}

export interface MemberProgram {
  id: string;
  member_id: string;
  program_id: string;
  coach_id: string;
  start_date: string;
  active: boolean;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_type: MealType;
  eaten_at: string;
  caption: string;
  portion: Portion;
  tags: string[];
  photo_key: string | null;
  photo_url: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  ai_estimated: boolean;
  share_with_coach: boolean;
  created_at: string;
}

export interface MealComment {
  id: string;
  meal_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface MealLike {
  meal_id: string;
  user_id: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number;
}

export interface Reminder {
  id: string;
  user_id: string;
  kind: ReminderKind;
  label: string;
  remind_time: string; // "HH:MM:SS"
  days: number[];
  repeat_every_min: number | null;
  repeat_until: string | null;
  enabled: boolean;
  snooze_until: string | null;
  last_fired_at: string | null;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  image_key: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NutritionEstimate {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  tags: string[];
  confidence: "low" | "medium" | "high";
  note: string;
}
