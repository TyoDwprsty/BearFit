/**
 * Central access to environment variables.
 * Values in `.env.example` are placeholders; `isPlaceholder` lets the app
 * degrade gracefully (show a setup notice) instead of crashing.
 */

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return /your-|placeholder|example\.com$/i.test(value);
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

export const serverEnv = {
  supabaseSecretKey:
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "bearfit",
  r2PublicUrl: (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, ""),
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqVisionModel:
    process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.8-27b",
  cronSecret: process.env.CRON_SECRET ?? "",
};

export const isSupabaseConfigured = () =>
  !isPlaceholder(env.supabaseUrl) && !isPlaceholder(env.supabaseKey);

export const isR2Configured = () =>
  !isPlaceholder(serverEnv.r2AccountId) &&
  !isPlaceholder(serverEnv.r2AccessKeyId) &&
  !isPlaceholder(serverEnv.r2SecretAccessKey) &&
  !isPlaceholder(serverEnv.r2PublicUrl);

export const isPushConfigured = () =>
  !isPlaceholder(env.vapidPublicKey) && !isPlaceholder(serverEnv.vapidPrivateKey);

export const isGroqConfigured = () => !isPlaceholder(serverEnv.groqApiKey);
