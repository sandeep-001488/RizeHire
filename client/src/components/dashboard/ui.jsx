"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

/** One place for how each application status looks and reads. */
export const STATUS_META = {
  pending: { label: "Pending", dot: "bg-amber-500", pill: "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20", bar: "bg-amber-400" },
  viewed: { label: "Viewed", dot: "bg-sky-500", pill: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20", bar: "bg-sky-400" },
  "moving-forward": { label: "Shortlisted", dot: "bg-violet-500", pill: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/20", bar: "bg-violet-500" },
  accepted: { label: "Accepted", dot: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20", bar: "bg-emerald-500" },
  rejected: { label: "Not selected", dot: "bg-rose-500", pill: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20", bar: "bg-rose-400" },
};
export const STATUS_ORDER = ["pending", "viewed", "moving-forward", "accepted", "rejected"];

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function StatusPill({ status, className }) {
  const meta = STATUS_META[status] || { label: status, dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground ring-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", meta.pill, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}


export function StatCard({ icon: Icon, label, value, hint, loading, href }) {
  const body = (
    <div className={cn("group relative h-full rounded-xl border bg-card p-5", href && "card-hover")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-16" />
      ) : (
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function SectionCard({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card", className)}>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function ViewAllLink({ href, children = "View all" }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/** Horizontal stacked bar of application statuses with a legend. */
export function PipelineBar({ byStatus = {}, total, compact = false }) {
  const sum = total ?? STATUS_ORDER.reduce((a, s) => a + (byStatus[s] || 0), 0);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Application status breakdown">
        {sum > 0 &&
          STATUS_ORDER.map((s) =>
            byStatus[s] ? (
              <div key={s} className={cn("h-full", STATUS_META[s].bar)} style={{ width: `${(byStatus[s] / sum) * 100}%` }} />
            ) : null
          )}
      </div>
      <ul className={cn("mt-4 grid gap-2.5", compact ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-5")}>
        {STATUS_ORDER.map((s) => (
          <li key={s} className={cn("flex items-center justify-between gap-2 text-sm", !compact && "sm:flex-col sm:items-start sm:gap-0.5")}>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
              {STATUS_META[s].label}
            </span>
            <span className={cn("font-semibold tabular-nums", !compact && "sm:text-xl sm:font-bold sm:font-[family-name:var(--font-display)]")}>
              {byStatus[s] || 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Circular match score, 0-100. */
export function ScoreRing({ score = 0, size = 52, stroke = 5, className }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color =
    value >= 75 ? "stroke-emerald-500" : value >= 55 ? "stroke-primary" : value >= 35 ? "stroke-amber-500" : "stroke-rose-400";
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          className={cn("transition-[stroke-dashoffset] duration-700", color)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
        {value}
        <span className="text-[9px] font-semibold text-muted-foreground">%</span>
      </span>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Page header at the top of each dashboard: greeting, one-line summary, actions, and a side card. */
export function DashboardHero({ eyebrow, title, subtitle, actions, aside }) {
  return (
    <section className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>}
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {aside}
    </section>
  );
}
