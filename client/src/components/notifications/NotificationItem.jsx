'use client';

import { formatDistanceToNow } from 'date-fns';
import { Mail, MessageSquare, CheckCircle, AlertCircle, X } from 'lucide-react';

const iconMap = {
  mail: Mail,
  'message-square': MessageSquare,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
};

const iconColorMap = {
  mail: 'text-blue-500',
  'message-square': 'text-green-500',
  'check-circle': 'text-emerald-500',
  'alert-circle': 'text-amber-500',
};

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}) {
  const Icon = iconMap[notification.icon] || Mail;

  const handleMarkAsRead = (e) => {
    e.stopPropagation();
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification._id);
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 mb-2 rounded-lg border cursor-pointer transition-all ${
        notification.read
          ? 'bg-background border-border hover:bg-accent'
          : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
      }`}
    >
      {/* Icon */}
      <div className="mt-1 flex-shrink-0">
        <Icon className={`w-5 h-5 ${iconColorMap[notification.icon] || 'text-gray-400'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">
              {notification.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.description}
            </p>
          </div>

          {/* Read indicator dot */}
          {!notification.read && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
          )}
        </div>

        {/* Time */}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {!notification.read && (
          <button
            onClick={handleMarkAsRead}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Mark as read"
          >
            <div className="w-2 h-2 bg-primary rounded-full" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
