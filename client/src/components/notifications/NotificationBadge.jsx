'use client';

import { Bell } from 'lucide-react';

export default function NotificationBadge({ count, onClick, isLoading = false }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 text-foreground hover:bg-accent rounded-full transition-colors"
      aria-label="Notifications"
      disabled={isLoading}
    >
      <Bell className="w-5 h-5" />

      {/* Badge */}
      {count > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
