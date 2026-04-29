import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const krFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const krWholeFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

export function formatKr(value: number | null | undefined, opts?: { whole?: boolean }) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return (opts?.whole ? krWholeFormatter : krFormatter).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)} %`;
}

export function pluralize(n: number, en: string, fl: string) {
  return n === 1 ? en : fl;
}
