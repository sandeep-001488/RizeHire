"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { applicationsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Eye,
  Inbox,
  MapPin,
  PlusCircle,
  Users,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import {
  DashboardHero,
  EmptyState,
  PipelineBar,
  SectionCard,
  Skeleton,
  StatCard,
  StatusPill,
  ViewAllLink,
  greeting,
} from "./ui";
import { getInitials } from "@/components/layout/Header";

function MatchBar({ score }) {
  if (score === null || score === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  const v = Math.max(0, Math.min(100, Math.round(score)));
  const color = v >= 75 ? "bg-emerald-500" : v >= 55 ? "bg-primary" : v >= 35 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2" title={`${v}% match`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
      </div>
      <span className="w-8 text-xs font-medium tabular-nums text-muted-foreground">{v}%</span>
    </div>
  );
}

export default function PosterDashboard({ user }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    applicationsAPI.getDashboardStats()
      .then((r) => alive && setData(r.data.data))
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setData({ jobs: { total: 0, open: 0, views: 0 }, applicants: { total: 0, byStatus: {} }, topJobs: [], recentApplicants: [] });
      });
    return () => { alive = false; };
  }, [user?._id]);

  const loading = data === null;
  const by = data?.applicants?.byStatus || {};
  const pending = by.pending || 0;
  const firstName = user?.name?.split(" ")[0] || "there";

  const subtitle = loading
    ? "Here's your hiring at a glance."
    : data.jobs.total === 0
      ? "Post your first job and AI-screened applicants will start showing up here."
      : pending > 0
        ? `${pending} applicant${pending === 1 ? " is" : "s are"} waiting for your review.`
        : "You're all caught up. Nobody is waiting for a review.";

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${firstName}`}
        subtitle={subtitle}
        actions={
          <>
            <Button asChild>
              <Link href="/post-job"><PlusCircle className="h-4 w-4" /> Post a job</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/jobs/my-posted-jobs">Manage jobs</Link>
            </Button>
          </>
        }
      />

      {failed && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Couldn't load your hiring stats. The server may be waking up; refresh in a few seconds.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Open jobs" value={data?.jobs.open ?? 0} hint={loading ? " " : `of ${data.jobs.total} posted`} loading={loading} href="/jobs/my-posted-jobs" />
        <StatCard icon={Users} label="Applicants" value={data?.applicants.total ?? 0} hint="Across all jobs" loading={loading} />
        <StatCard icon={Inbox} label="Awaiting review" value={pending} hint="Pending applications" loading={loading} />
        <StatCard icon={Eye} label="Job views" value={(data?.jobs.views ?? 0).toLocaleString()} hint="Total across your posts" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Hiring pipeline" description="Every applicant across your jobs, by stage">
            {loading ? <Skeleton className="h-24 w-full" /> : <PipelineBar byStatus={by} total={data.applicants.total} />}
          </SectionCard>

          <SectionCard title="Recent applicants" description="Newest first, with AI match score" bodyClassName="p-2">
            {loading ? (
              <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : data.recentApplicants.length === 0 ? (
              <EmptyState icon={UserCheck} title="No applicants yet" description="When candidates apply, they'll appear here with their match score." />
            ) : (
              <ul>
                {data.recentApplicants.map((a) => (
                  <li key={a._id}>
                    <Link
                      href={a.job ? `/jobs/${a.job._id}/applicants` : "/jobs/my-posted-jobs"}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                        {getInitials(a.applicant?.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.applicant?.name || "Deleted user"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.job?.title || "Job removed"}
                          {a.appliedAt && ` · ${formatDistanceToNow(new Date(a.appliedAt), { addSuffix: true })}`}
                        </p>
                      </div>
                      <div className="hidden sm:block"><MatchBar score={a.matchScore} /></div>
                      <StatusPill status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Your jobs" description="Most applicants first" action={<ViewAllLink href="/jobs/my-posted-jobs" />} bodyClassName="p-2">
          {loading ? (
            <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : data.topJobs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No jobs posted yet"
              description="Create a listing and we'll screen applicants for you."
              action={<Button asChild className="rounded-full"><Link href="/post-job"><PlusCircle className="h-4 w-4" /> Post a job</Link></Button>}
            />
          ) : (
            <ul>
              {data.topJobs.map((job) => (
                <li key={job._id}>
                  <Link href={`/jobs/${job._id}/applicants`} className="block rounded-xl px-3 py-3 transition-colors hover:bg-muted">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{job.title}</p>
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          job.isOpen ? "bg-emerald-500" : "bg-muted-foreground/40"
                        )}
                        title={job.isOpen ? "Accepting applications" : "Closed"}
                      />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {job.company && <span className="truncate">{job.company}</span>}
                      {job.city && (<><span>·</span><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{job.city}</span></>)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.applicants}</span>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {job.views}</span>
                      {job.pending > 0 && (
                        <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                          {job.pending} new
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
