// src/lib/notificationTypes.ts
// The kinds of in-app notification and the icon each shows. Client-safe:
// the bell and /notifications import it too. Add a kind here, then send it
// with notify() (lib/notifications.ts).
export const NOTIFICATION_KINDS = {
  badge_earned: { icon: "🏅" },
  suggestion_accepted: { icon: "🕵️" },
  suggestion_declined: { icon: "💡" },
  submission_verified: { icon: "✅" },
  submission_endorsed: { icon: "🎓" },
  submission_rejected: { icon: "📄" },
  role_approved: { icon: "⭐" },
  role_rejected: { icon: "📝" },
  typed_verified: { icon: "✅" },
  typed_disputed: { icon: "✏️" },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_KINDS;
export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_KINDS) as NotificationType[];

/** A notification as the API returns it. */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  icon: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

/** Only links within the site: a path, not "//host" or "https://...". */
export function isSafeNotificationLink(link: unknown): link is string {
  return typeof link === "string" && /^\/(?!\/)[^\s\\]*$/.test(link) && link.length <= 300;
}
