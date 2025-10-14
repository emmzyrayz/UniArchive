"use client";

import { ReactNode, useState } from "react";
import { Input, Avatar, Card } from "@/components/UI";
import { LuBell, LuChevronDown, LuSearch } from "react-icons/lu";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onProfileClick?: () => void;
  onNotificationMarkAsRead?: (notificationId: string) => void;
  actions?: ReactNode;
  className?: string;
  showSearch?: boolean;
}

export default function HeaderBar({
  title,
  subtitle,
  searchPlaceholder = "Search...",
  onSearch,
  searchValue,
  user,
  notifications = [],
  onNotificationClick,
  onProfileClick,
  onNotificationMarkAsRead,
  actions,
  className = "",
  showSearch = true,
}: HeaderBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const notificationColors = {
    info: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200",
  };

  return (
    <Card
      variant="flat"
      padding="none"
      className={`border-b border-gray-200 rounded-none ${className}`}
    >
      <div className="flex items-center justify-between p-4 gap-4">
        {/* Left Section - Title & Subtitle */}
        {(title || subtitle) && (
          <div className="flex-shrink-0 min-w-0">
            {title && (
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Center Section - Search */}
        {showSearch && onSearch && (
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <Input
              name="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              icon={<LuSearch className="w-4 h-4" />}
            />
          </div>
        )}

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Custom Actions */}
          {actions}

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <LuBell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  />

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {unreadCount} unread
                        </p>
                      )}
                    </div>

                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            onNotificationClick?.(notification);
                            onNotificationMarkAsRead?.(notification.id);
                            setShowNotifications(false);
                          }}
                          className={`
                            w-full text-left p-3 hover:bg-gray-50 transition-colors
                            border-l-4
                            ${
                              notification.type === "info"
                                ? "border-blue-500"
                                : notification.type === "success"
                                ? "border-green-500"
                                : notification.type === "warning"
                                ? "border-yellow-500"
                                : "border-red-500"
                            }
                            ${
                              !notification.read
                                ? notificationColors[notification.type]
                                : "border-l-gray-200"
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Type Icon */}
                            <div
                              className={`
                              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                              ${
                                notification.type === "info"
                                  ? "bg-blue-100 text-blue-600"
                                  : notification.type === "success"
                                  ? "bg-green-100 text-green-600"
                                  : notification.type === "warning"
                                  ? "bg-yellow-100 text-yellow-600"
                                  : "bg-red-100 text-red-600"
                              }
                            `}
                            >
                              {notification.type === "info" && (
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {notification.type === "success" && (
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {notification.type === "warning" && (
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {notification.type === "error" && (
                                <svg
                                  className="w-4 h-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm text-gray-900">
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {notifications.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <LuBell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Profile */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                  status="online"
                />
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-32">
                    {user.email}
                  </p>
                </div>
                <LuChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  />

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                    <div className="p-3 border-b border-gray-200">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          onProfileClick?.();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        View Profile
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                        Settings
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search */}
      {showSearch && onSearch && (
        <div className="px-4 pb-4 md:hidden">
          <Input
            name="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            icon={<LuSearch className="w-4 h-4" />}
          />
        </div>
      )}
    </Card>
  );
}

// 📖 Usage Examples:
// 1. Basic Header
// tsx<HeaderBar
//   title="Dashboard"
//   subtitle="Welcome back!"
// />
// 2. With Search
// tsxconst [searchQuery, setSearchQuery] = useState("");

// <HeaderBar
//   title="Materials"
//   onSearch={setSearchQuery}
//   searchValue={searchQuery}
//   searchPlaceholder="Search materials..."
// />
// 3. With User Profile
// tsx<HeaderBar
//   title="Dashboard"
//   user={{
//     name: "Emmanuel Okoro",
//     email: "emmanuel@example.com",
//     avatar: "/avatar.jpg",
//   }}
//   onProfileClick={() => router.push("/profile")}
// />
// 4. With Notifications
// tsx<HeaderBar
//   title="Dashboard"
//   user={user}
//   notifications={[
//     {
//       id: "1",
//       title: "New Material Uploaded",
//       message: "John Doe uploaded CS301 notes",
//       time: "5 minutes ago",
//       read: false,
//       type: "info",
//     },
//     {
//       id: "2",
//       title: "Assignment Due",
//       message: "Submit your assignment by tomorrow",
//       time: "1 hour ago",
//       read: false,
//       type: "warning",
//     },
//   ]}
//   onNotificationClick={(notif) => console.log("Clicked:", notif)}
//   onNotificationMarkAsRead={(id) => markAsRead(id)}
// />
// 5. With Custom Actions
// tsximport { Button } from "@/components/UI";
// import { LuPlus, LuFilter } from "react-icons/lu";

// <HeaderBar
//   title="Materials"
//   user={user}
//   onSearch={handleSearch}
//   actions={
//     <div className="flex gap-2">
//       <Button
//         label="Upload"
//         icon={<LuPlus />}
//         size="sm"
//         onClick={() => router.push("/upload")}
//       />
//       <Button
//         label="Filter"
//         icon={<LuFilter />}
//         variant="outline"
//         size="sm"
//       />
//     </div>
//   }
// />
// 6. Complete Dashboard Header
// tsx<HeaderBar
//   title={`Welcome, ${user.name}!`}
//   subtitle="Here's what's happening today"
//   searchPlaceholder="Search materials, courses..."
//   onSearch={handleSearch}
//   searchValue={searchQuery}
//   user={{
//     name: user.name,
//     email: user.email,
//     avatar: user.avatar,
//   }}
//   notifications={notifications}
//   onNotificationClick={handleNotificationClick}
//   onNotificationMarkAsRead={markNotificationAsRead}
//   onProfileClick={() => router.push("/profile")}
//   actions={
//     <Button
//       label="Upload Material"
//       icon={<LuUpload />}
//       onClick={() => router.push("/upload")}
//     />
//   }
// />
// 7. Without Search
// tsx<HeaderBar
//   title="Settings"
//   subtitle="Manage your account"
//   showSearch={false}
//   user={user}
// />
// 8. Mobile Responsive
// tsx// The component is already mobile-responsive:
// // - Search moves below on mobile
// // - User name/email hidden on mobile
// // - Only avatar shown on small screens
// <HeaderBar
//   title="Dashboard"
//   user={user}
//   onSearch={handleSearch}
// />