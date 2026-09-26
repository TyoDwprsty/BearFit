export type ThemePref = "light" | "dark" | "system";
export const THEME_COOKIE = "bf_theme";

export function normalizeTheme(value: string | undefined | null): ThemePref {
  return value === "light" || value === "dark" ? value : "system";
}

/** Inline script that resolves "system" before first paint (avoids a flash). */
export const themeBootScript = `(function(){try{var d=document.documentElement;var p=d.getAttribute('data-theme-pref');if(p==='system'||!p){var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(){d.setAttribute('data-theme',m.matches?'dark':'light');var c=document.querySelector('meta[name="theme-color"]');if(c)c.setAttribute('content',m.matches?'#16131D':'#FFF8F0');};a();m.addEventListener('change',a);}}catch(e){}})();`;
