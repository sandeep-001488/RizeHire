"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { aiAPI, applicationsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  FileUp,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Wand2,
} from "lucide-react";
import {
  DashboardHero,
  EmptyState,
  PipelineBar,
  ScoreRing,
  SectionCard,
  Skeleton,
  StatCard,
  StatusPill,
  ViewAllLink,
  greeting,
} from "./ui";

function profileChecks(user) {
  return [
    { label: "Resume parsed", done: !!user?.parsedResume },
    { label: "At least 3 skills", done: (user?.skills?.length || user?.parsedResume?.skills?.length || 0) >= 3 },
    { label: "Location added", done: !!user?.location },
    { label: "Short bio", done: !!user?.bio },
    { label: "LinkedIn linked", done: !!user?.linkedinUrl },
  ];
}

function CompanyMark({ name }) {
  const letter = (name || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent font-[family-name:var(--font-display)] text-sm font-bold text-accent-foreground">
      {letter}
    </span>
  );
}

function ProfileStrength({ user }) {
  const checks = profileChecks(user);
  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  return (
    <Link
      href="/profile"
      className="group flex w-full items-center gap-4 rounded-2xl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/18 lg:w-80"
    >
      <div className="relative">
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r="27" fill="none" strokeWidth="6" className="stroke-white/20" />
          <circle
            cx="32" cy="32" r="27" fill="none" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 27}
            strokeDashoffset={2 * Math.PI * 27 * (1 - pct / 100)}
            className="stroke-white transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Profile strength</p>
        <ul className="mt-1 space-y-0.5 text-xs text-white/85">
          {checks.filter((c) => !c.done).slice(0, 2).map((c) => (
            <li key={c.label} className="flex items-center gap-1.5">
              <Circle className="h-3 w-3" /> {c.label}
            </li>
          ))}
          {done === checks.length && (
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> All set, recruiters see your full profile</li>
          )}
        </ul>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function MatchCard({ item, userSkills }) {
  const job = item.job || {};
  const skills = job.skills || [];
  const matched = new Set(skills.filter((s) => userSkills.has(s.toLowerCase())));
  const ordered = [...skills].sort((a, b) => Number(matched.has(b)) - Number(matched.has(a))).slice(0, 5);
  const place = [job.location?.city, job.workMode].filter(Boolean).join(" · ");
  return (
    <Link href={`/jobs/${job._id}`} className="card-hover flex gap-4 rounded-xl border bg-card p-4">
      <ScoreRing score={item.matchScore} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{job.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {job.company?.name || "Company not listed"}
              {place && (
                <>
                  <span className="mx-1.5">·</span>
                  <MapPin className="mr-0.5 inline h-3 w-3 align-[-1px]" />
                  {place}
                </>
              )}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground sm:inline">
            {job.jobType?.replace("-", " ")}
          </span>
        </div>
        {item.reason && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{item.reason}</p>}
        {ordered.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {ordered.map((s) => (
              <span
                key={s}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium",
                  matched.has(s)
                    ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {matched.has(s) && "✓ "}
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function SeekerDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [recs, setRecs] = useState(null);

  useEffect(() => {
    let alive = true;
    applicationsAPI.getDashboardStats()
      .then((r) => alive && setStats(r.data.data))
      .catch(() => alive && setStats({ applications: { total: 0, byStatus: {} } }));
    applicationsAPI.getMyApplications({ limit: 5 })
      .then((r) => alive && setRecent(r.data.data.applications || []))
      .catch(() => alive && setRecent([]));
    // Recommendations can take a few seconds (Gemini tier), so they load on their own
    aiAPI.getRecommendations()
      .then((r) => {
        if (!alive) return;
        setRecs(r.data.data.recommendations || []);
      })
      .catch(() => alive && setRecs([]));
    return () => { alive = false; };
  }, [user?._id]);

  const userSkills = useMemo(
    () => new Set([...(user?.skills || []), ...(user?.parsedResume?.skills || [])].map((s) => s.toLowerCase())),
    [user]
  );

  const by = stats?.applications?.byStatus || {};
  const total = stats?.applications?.total ?? 0;
  const inReview = (by.pending || 0) + (by.viewed || 0);
  const firstName = user?.name?.split(" ")[0] || "there";
  const statsLoading = stats === null;

  const subtitle = statsLoading
    ? "Here's your job search at a glance."
    : total === 0
      ? "Let's land your first application. Your best matches are below."
      : `${inReview + (by["moving-forward"] || 0)} of your ${total} application${total === 1 ? "" : "s"} are still in play.`;

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${firstName}`}
        subtitle={subtitle}
        actions={
          <>
            <Button asChild size="lg" className="rounded-full bg-white text-primary shadow-lg hover:bg-white/90">
              <Link href="/jobs"><Search className="h-4 w-4" /> Browse jobs</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full text-white ring-1 ring-white/40 hover:bg-white/15 hover:text-white">
              <Link href="/ai/recommendations"><Sparkles className="h-4 w-4" /> All AI matches</Link>
            </Button>
          </>
        }
        aside={<ProfileStrength user={user} />}
      />

      {!user?.parsedResume && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <FileUp className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Upload your resume to start applying</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                We read your skills and experience from it, which powers your match scores and is required to apply.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 rounded-full">
            <Link href="/profile">Upload resume <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} label="Applications" value={total} hint="Sent in total" tone="indigo" loading={statsLoading} href="/applications" />
        <StatCard icon={Clock} label="In review" value={inReview} hint="Pending or viewed" tone="amber" loading={statsLoading} href="/applications" />
        <StatCard icon={Star} label="Shortlisted" value={by["moving-forward"] || 0} hint="Moving forward" tone="violet" loading={statsLoading} href="/applications" />
        <StatCard icon={Trophy} label="Offers" value={by.accepted || 0} hint="Accepted" tone="emerald" loading={statsLoading} href="/applications" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Top matches for you"
          action={<ViewAllLink href="/ai/recommendations" />}
        >
          {recs === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px] w-full rounded-xl" />)}
            </div>
          ) : recs.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No matches yet"
              description="Add a few skills or upload your resume and we'll rank open jobs for you."
              action={<Button asChild variant="outline" className="rounded-full"><Link href="/profile">Update profile</Link></Button>}
            />
          ) : (
            <div className="space-y-3">
              {recs.slice(0, 5).map((item) => (
                <MatchCard key={item.job?._id} item={item} userSkills={userSkills} />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Application pipeline" description="Where your applications stand">
            {statsLoading ? <Skeleton className="h-40 w-full" /> : <PipelineBar byStatus={by} total={total} compact />}
          </SectionCard>

          <SectionCard title="Recent applications" action={<ViewAllLink href="/applications" />} bodyClassName="p-2">
            {recent === null ? (
              <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : recent.length === 0 ? (
              <EmptyState icon={Briefcase} title="No applications yet" description="Jobs you apply to will show up here." />
            ) : (
              <ul>
                {recent.map((app) => (
                  <li key={app._id}>
                    <Link
                      href={app.job ? `/jobs/${app.job._id}` : "/applications"}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                    >
                      <CompanyMark name={app.job?.company?.name || app.job?.title} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{app.job?.title || "Job no longer available"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {app.job?.company?.name ? `${app.job.company.name} · ` : ""}
                          {app.appliedAt ? formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true }) : ""}
                        </p>
                      </div>
                      <StatusPill status={app.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { href: "/ai/suggestions", icon: Wand2, title: "Career suggestions", text: "Roles and skills to aim for" },
          { href: "/ai/skills", icon: Sparkles, title: "Skill extractor", text: "Pull skills from any text" },
          { href: "/messages", icon: MessageSquare, title: "Messages", text: "Chat with recruiters" },
          { href: "/profile", icon: UserRound, title: "Profile", text: "Resume, skills, links" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="card-hover group rounded-2xl border bg-card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <a.icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 text-sm font-semibold">{a.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{a.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
