/**
 * Utility function to handle notification click routing
 * Routes to appropriate page based on notification type and actionUrl
 */
export const handleNotificationClick = (notification, router) => {
  if (!notification || !router) return;

  try {
    // Use the actionUrl from the notification
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  } catch (error) {
    console.error('Error handling notification click:', error);
  }
};

/**
 * Format notification for display based on type
 */
export const getNotificationDisplayInfo = (notification) => {
  const typeInfo = {
    new_application: {
      icon: 'mail',
      color: 'blue',
    },
    new_message: {
      icon: 'message-square',
      color: 'green',
    },
    status_change: {
      icon: 'check-circle',
      color: 'purple',
    },
  };

  return typeInfo[notification.type] || { icon: 'alert-circle', color: 'gray' };
};
