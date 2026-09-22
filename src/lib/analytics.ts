"use client";

export function track(nome: string) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", nome);
  }
}

async function sha256(str: string) {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function detectarOrigem(): string {
  if (typeof window === "undefined") return "/";
  const paramOrigem = new URLSearchParams(window.location.search).get("origem");
  return paramOrigem || window.location.pathname || "/";
}

export async function trackFormSuccess({ email, setor }: { email: string; setor: string }) {
  const vals = { form_name: "complaint_form", setor: setor || "not_provided" };
  try {
    const hash = email ? await sha256(email.trim().toLowerCase()) : null;
    if (hash && typeof window.gtag === "function") {
      window.gtag("set", "user_data", { sha256_email_address: hash });
    }
  } catch {
    /* nunca bloquear a conversão */
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", "submit_complaint", {
      event_category: "conversion",
      event_label: "landing_form",
      ...vals,
    });
  }
  (window.dataLayer = window.dataLayer || []).push({ event: "dolado_form_submit", ...vals });
}
