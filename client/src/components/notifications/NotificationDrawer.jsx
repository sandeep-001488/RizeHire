'use client';

import { useEffect, useRef } from 'react';
import { X, CheckCheck, Trash2 } from 'lucide-react';
import NotificationItem from './NotificationItem';

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  unreadCount,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  onNotificationClick,
  isLoading = false,
}) {
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-screen max-h-screen w-full sm:w-96 bg-background border-l border-border shadow-lg z-50 flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Notifications {unreadCount > 0 && <span className="text-red-500">({unreadCount})</span>}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex-shrink-0 flex gap-2 px-4 py-3 border-b border-border">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                  onClick={() => {
                    onNotificationClick(notification);
                    if (!notification.read) {
                      onMarkAsRead(notification._id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex-shrink-0 border-t border-border p-4">
            <button
              onClick={() => {
                // Clear all could be implemented with a deleteAll endpoint
                notifications.forEach((notif) => onDelete(notif._id));
              }}
              className="flex items-center gap-1 w-full justify-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}
