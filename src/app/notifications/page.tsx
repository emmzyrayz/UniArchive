// app/notifications/page.tsx
// Every notification for the signed-in user (the navbar bell links here on
// phones). Signed-in only: the proxy sends visitors to sign in.
import { createMetadata } from "@/lib/seo";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata = createMetadata({
  title: "Notifications",
  description: "What's happened with your materials, suggestions and badges.",
  path: "/notifications",
  noIndex: true,
});

export default function NotificationsPage() {
  return (
    <main className="mt-[70px] min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <NotificationList tone="page" />
      </div>
    </main>
  );
}
