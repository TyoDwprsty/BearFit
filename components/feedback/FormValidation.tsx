"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Beru } from "@/components/Beru";
import { useI18n } from "@/components/I18nProvider";
import type { TFunction } from "@/lib/i18n";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function messageFor(el: Field, t: TFunction): string {
  const v = el.validity;
  if (v.valueMissing) return t("form.required");
  if (v.typeMismatch) return el.type === "email" ? t("form.email") : el.type === "url" ? t("form.url") : t("form.invalid");
  if (v.tooShort && "minLength" in el) return t("form.tooShort", { n: el.minLength });
  if (v.tooLong && "maxLength" in el) return t("form.tooLong", { n: el.maxLength });
  if (v.rangeUnderflow && "min" in el) return t("form.min", { n: el.min });
  if (v.rangeOverflow && "max" in el) return t("form.max", { n: el.max });
  if (v.stepMismatch) return t("form.step");
  if (v.patternMismatch) return el.title || t("form.pattern");
  if (v.customError) return el.validationMessage;
  return t("form.invalid");
}

const isField = (x: EventTarget | null): x is Field =>
  x instanceof HTMLInputElement || x instanceof HTMLTextAreaElement || x instanceof HTMLSelectElement;

/**
 * Replaces the browser's "Please fill out this field" bubbles with a BearFit one:
 * catches every `invalid` event, focuses the first bad field and points Beru at it.
 */
export function FormValidation() {
  const { t } = useI18n();
  const [tip, setTip] = useState<{ el: Field; text: string; host: Element } | null>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let claimed = false; // only the first invalid field of a submit gets the bubble
    const onInvalid = (e: Event) => {
      if (!isField(e.target)) return;
      const el = e.target;
      e.preventDefault();
      el.setAttribute("aria-invalid", "true");
      if (claimed) return;
      claimed = true;
      window.setTimeout(() => (claimed = false), 0);
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setTip({ el, text: messageFor(el, t), host: el.closest("dialog") ?? document.body });
    };
    const onEdit = (e: Event) => {
      if (!isField(e.target) || !e.target.hasAttribute("aria-invalid")) return;
      if (e.target.validity.valid) e.target.removeAttribute("aria-invalid");
      setTip((cur) => (cur?.el === e.target ? null : cur));
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, [t]);

  // Follow the field while the page scrolls; hide after a while or when it loses focus.
  useEffect(() => {
    if (!tip) return;
    let frame = 0;
    const place = () => {
      const node = bubble.current;
      if (node) {
        const r = tip.el.getBoundingClientRect();
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        const below = r.bottom + 12 + h < window.innerHeight;
        const left = Math.max(16, Math.min(r.left, window.innerWidth - 16 - w));
        node.style.top = `${below ? r.bottom + 12 : r.top - 12 - h}px`;
        node.style.left = `${left}px`;
        node.dataset.side = below ? "below" : "above";
        node.style.setProperty("--arrow-x", `${Math.min(Math.max(r.left + 22 - left, 18), w - 18)}px`);
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    const hide = window.setTimeout(() => setTip(null), 5000);
    const onBlur = () => window.setTimeout(() => setTip((cur) => (cur?.el === tip.el ? null : cur)), 150);
    tip.el.addEventListener("blur", onBlur);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hide);
      tip.el.removeEventListener("blur", onBlur);
    };
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div ref={bubble} role="alert" className="form-tip" style={{ top: -9999, left: 0 }}>
      <span className="shrink-0">
        <Beru pose="alarm" size={34} />
      </span>
      <span>{tip.text}</span>
    </div>,
    tip.host,
  );
}
