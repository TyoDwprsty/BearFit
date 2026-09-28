import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { FormValidation } from "@/components/feedback/FormValidation";
import { NavigationProgress } from "@/components/feedback/NavigationProgress";
import { I18nProvider } from "@/components/I18nProvider";
import { DisablePinchZoom } from "@/components/pwa/DisablePinchZoom";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { getLocale } from "@/lib/i18n/server";
import { normalizeTheme, THEME_COOKIE, themeBootScript } from "@/lib/theme";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "BearFit", template: "%s · BearFit" },
  description: "Catat makan, pilih latihan harian, dan dipantau coach — bareng Beru si beruang.",
  applicationName: "BearFit",
  appleWebApp: { capable: true, title: "BearFit", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // App-like feel: no pinch / double-tap zoom (iOS also needs <DisablePinchZoom />).
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FFF8F0",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const themePref = normalizeTheme(store.get(THEME_COOKIE)?.value);
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      data-theme={themePref === "system" ? "light" : themePref}
      data-theme-pref={themePref}
      className={`${fredoka.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full bg-bg text-text">
        <I18nProvider locale={locale}>
          <FeedbackProvider>
            {children}
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            <ServiceWorkerRegister />
            <DisablePinchZoom />
            <FormValidation />
          </FeedbackProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
