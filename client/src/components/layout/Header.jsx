"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAuthStore from "@/stores/authStore";
import useThemeStore from "@/stores/themeStore";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationBadge from "@/components/notifications/NotificationBadge";
import NotificationDrawer from "@/components/notifications/NotificationDrawer";
import { handleNotificationClick } from "@/utils/notificationRouter";
import { cn } from "@/lib/utils";
import {
  Moon,
  Sun,
  User,
  LogOut,
  Briefcase,
  PlusCircle,
  FileText,
  Sparkles,
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

const seekerNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Applications", href: "/applications", icon: FileText },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "AI Tools", href: "/ai/recommendations", icon: Sparkles, match: "/ai" },
];

const posterNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Post Job", href: "/post-job", icon: PlusCircle },
  { name: "My Jobs", href: "/jobs/my-posted-jobs", icon: Briefcase, match: "/jobs/my-posted-jobs" },
  { name: "Messages", href: "/messages", icon: MessageSquare },
];

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function isActive(pathname, item) {
  const base = item.match || item.href;
  if (base === "/jobs") return pathname === "/jobs" || /^\/jobs\/[^/]+$/.test(pathname);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, isInitialized, isHydrated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const {
    unreadCount,
    notifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    isFetching,
  } = useNotifications();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const navigation = user?.role === "poster" ? posterNavigation : seekerNavigation;

  if (!isHydrated || !isInitialized) {
    return null; // Don't render header until auth state is known
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2.5">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-md shadow-primary/25">
              <Briefcase className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
              Rize<span className="text-primary">Hire</span>
            </span>
          </Link>

          {isAuthenticated && (
            <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-muted/50 p-1 md:flex">
              {navigation.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full"
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {isAuthenticated ? (
              <>
                <NotificationBadge
                  count={unreadCount}
                  onClick={() => setIsNotificationDrawerOpen(true)}
                  isLoading={isFetching}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="ml-1 hidden items-center gap-2 rounded-full border border-border/70 py-1 pl-1 pr-2.5 text-sm font-medium transition-colors hover:bg-muted md:flex"
                      aria-label="Account menu"
                    >
                      <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {getInitials(user?.name)}
                      </span>
                      <span className="max-w-[9rem] truncate">{user?.name?.split(" ")[0] || "Account"}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="font-normal">
                      <p className="truncate text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      <span className="mt-2 inline-flex rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                        {user?.role === "poster" ? "Recruiter" : "Job seeker"}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push("/profile")}>
                      <User className="h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push("/messages")}>
                      <MessageSquare className="h-4 w-4" />
                      Messages
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full md:hidden"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="rounded-full px-5 shadow-md shadow-primary/25">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {isAuthenticated && isMenuOpen && (
          <div className="border-t md:hidden">
            <nav className="flex flex-col gap-1 py-3">
              {navigation.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className="mt-2 border-t pt-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>{user?.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
        onMarkAllAsRead={markAllAsRead}
        onNotificationClick={(notification) => {
          handleNotificationClick(notification, router);
          setIsNotificationDrawerOpen(false);
        }}
        isLoading={isFetching}
      />
    </header>
  );
}
