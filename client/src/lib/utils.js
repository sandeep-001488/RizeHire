import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatSalary(min, max, currency = "USD", period = "monthly") {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const hasMin = min !== undefined && min !== null && min !== "" && !Number.isNaN(Number(min));
  const hasMax = max !== undefined && max !== null && max !== "" && !Number.isNaN(Number(max));
  const per = period ? `/${period}` : "";

  if (hasMin && hasMax && Number(min) !== Number(max)) {
    return `${formatter.format(min)} - ${formatter.format(max)}${per}`;
  }
  if (hasMin && hasMax) return `${formatter.format(min)}${per}`;
  if (hasMin) return `From ${formatter.format(min)}${per}`;
  if (hasMax) return `Up to ${formatter.format(max)}${per}`;
  return "Salary not disclosed";
}

/** "Bangalore, India" from whatever parts exist; never prints "undefined". */
export function formatLocation(location, fallback = "Location not specified") {
  if (!location) return fallback;
  if (typeof location === "string") return location || fallback;
  const parts = [location.city, location.state, location.country].filter(Boolean);
  // Skip the state when city + country are both present, to keep it short
  const shown = parts.length === 3 ? [location.city, location.country] : parts;
  return shown.join(", ") || fallback;
}

export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}
