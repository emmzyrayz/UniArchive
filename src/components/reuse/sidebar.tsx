"use client";

import { ReactElement, ReactNode, useState } from "react";
import Link from "next/link";
import { Divider, Badge, Avatar } from "@/components/UI";
import { LuChevronRight, LuChevronLeft, LuChevronDown } from "react-icons/lu";

interface SidebarItem {
  id: string;
  label: string;
  icon: ReactElement;
  href?: string;
  active?: boolean;
  badge?: number | string;
  onClick?: () => void;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  logo?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  footer?: ReactNode;
}

export default function Sidebar({
  items,
  user,
  logo,
  collapsed = false,
  onToggleCollapse,
  className = "",
  footer,
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    const buttonClasses = `
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
      text-sm font-medium transition-all duration-200
      ${level > 0 ? "ml-6" : ""}
      ${
        item.active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-gray-700 hover:bg-gray-100"
      }
      ${collapsed ? "justify-center" : "justify-start"}
    `;

    const content = (
      <>
        <span className={`flex-shrink-0 ${collapsed ? "" : ""}`}>
          {item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge && (
              <Badge
                label={item.badge}
                size="sm"
                color={item.active ? "white" : "indigo"}
                variant="soft"
                className="flex-shrink-0"
              />
            )}
            {hasChildren && (
              <LuChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            )}
          </>
        )}
      </>
    );

    return (
      <div key={item.id} className="w-full">
        {item.href ? (
          <Link href={item.href} className={buttonClasses}>
            {content}
          </Link>
        ) : (
          <button
            onClick={() => {
              if (hasChildren) {
                toggleExpand(item.id);
              }
              item.onClick?.();
            }}
            className={buttonClasses}
            title={collapsed ? item.label : undefined}
          >
            {content}
          </button>
        )}

        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        h-full flex flex-col bg-white border-r border-gray-200
        ${collapsed ? "w-16" : "w-64"} 
        transition-all duration-300
        ${className}
      `}
    >
      {/* Header with Logo */}
      <div
        className={`
        flex items-center ${collapsed ? "justify-center" : "justify-between"} 
        p-4 border-b border-gray-200 h-16
      `}
      >
        {!collapsed && logo && (
          <div className="flex-1 flex items-center">{logo}</div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <LuChevronRight className="w-5 h-5 text-gray-600" />
            ) : (
              <LuChevronLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => renderSidebarItem(item))}
      </nav>

      {/* User Section */}
      {user && (
        <>
          <Divider className="mx-3" />
          <div className={`p-4 ${collapsed ? "flex justify-center" : ""}`}>
            {collapsed ? (
              <Avatar
                src={user.avatar}
                alt={user.name}
                size="md"
                status="online"
              />
            ) : (
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  size="sm"
                  status="online"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.role || user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      {footer && !collapsed && (
        <div className="p-4 border-t border-gray-200">{footer}</div>
      )}
    </aside>
  );
}

// 📖 Usage Examples:
// 1. Basic Sidebar
// tsximport {
//   LuHome,
//   LuBook,
//   LuUsers,
//   LuSettings,
//   LuFileText,
// } from "react-icons/lu";

// const sidebarItems = [
//   {
//     id: "dashboard",
//     label: "Dashboard",
//     icon: <LuHome className="w-5 h-5" />,
//     href: "/dashboard",
//     active: true,
//   },
//   {
//     id: "materials",
//     label: "Materials",
//     icon: <LuBook className="w-5 h-5" />,
//     href: "/materials",
//     badge: 12,
//   },
//   {
//     id: "users",
//     label: "Users",
//     icon: <LuUsers className="w-5 h-5" />,
//     href: "/users",
//   },
//   {
//     id: "settings",
//     label: "Settings",
//     icon: <LuSettings className="w-5 h-5" />,
//     href: "/settings",
//   },
// ];

// <Sidebar items={sidebarItems} />
// 2. With Logo and User
// tsx<Sidebar
//   items={sidebarItems}
//   logo={
//     <div className="flex items-center gap-2">
//       <div className="w-8 h-8 bg-indigo-600 rounded-lg" />
//       <span className="font-bold text-xl">EduHub</span>
//     </div>
//   }
//   user={{
//     name: "Emmanuel Okoro",
//     email: "emmanuel@example.com",
//     avatar: "/avatar.jpg",
//     role: "Student",
//   }}
// />
// 3. Collapsible Sidebar
// tsxconst [collapsed, setCollapsed] = useState(false);

// <Sidebar
//   items={sidebarItems}
//   logo={<YourLogo />}
//   collapsed={collapsed}
//   onToggleCollapse={() => setCollapsed(!collapsed)}
//   user={user}
// />
// 4. With Nested Items (Sub-menus)
// tsxconst sidebarItems = [
//   {
//     id: "dashboard",
//     label: "Dashboard",
//     icon: <LuHome className="w-5 h-5" />,
//     href: "/dashboard",
//     active: true,
//   },
//   {
//     id: "materials",
//     label: "Materials",
//     icon: <LuBook className="w-5 h-5" />,
//     badge: 24,
//     children: [
//       {
//         id: "my-materials",
//         label: "My Materials",
//         icon: <LuFileText className="w-4 h-4" />,
//         href: "/materials/mine",
//       },
//       {
//         id: "shared-materials",
//         label: "Shared with Me",
//         icon: <LuShare className="w-4 h-4" />,
//         href: "/materials/shared",
//         badge: 3,
//       },
//       {
//         id: "archived",
//         label: "Archived",
//         icon: <LuArchive className="w-4 h-4" />,
//         href: "/materials/archived",
//       },
//     ],
//   },
//   {
//     id: "courses",
//     label: "Courses",
//     icon: <LuGraduationCap className="w-5 h-5" />,
//     children: [
//       {
//         id: "my-courses",
//         label: "My Courses",
//         icon: <LuBook className="w-4 h-4" />,
//         href: "/courses/mine",
//       },
//       {
//         id: "browse-courses",
//         label: "Browse Courses",
//         icon: <LuCompass className="w-4 h-4" />,
//         href: "/courses/browse",
//       },
//     ],
//   },
// ];

// <Sidebar items={sidebarItems} />
// 5. With Custom Footer
// tsximport { Button } from "@/components/UI";
// import { LuLogOut } from "react-icons/lu";

// <Sidebar
//   items={sidebarItems}
//   user={user}
//   footer={
//     <Button
//       label="Sign Out"
//       icon={<LuLogOut />}
//       variant="outline"
//       onClick={handleSignOut}
//       className="w-full"
//     />
//   }
// />
// 6. Complete Dashboard Layout
// tsx"use client";

// import { useState } from "react";
// import { Sidebar, HeaderBar } from "@/components/complex";
// import {
//   LuHome,
//   LuBook,
//   LuUpload,
//   LuStar,
//   LuSettings,
//   LuUsers,
//   LuBarChart,
// } from "react-icons/lu";

// export default function DashboardLayout({ children }) {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   const sidebarItems = [
//     {
//       id: "dashboard",
//       label: "Dashboard",
//       icon: <LuHome className="w-5 h-5" />,
//       href: "/dashboard",
//       active: true,
//     },
//     {
//       id: "materials",
//       label: "Materials",
//       icon: <LuBook className="w-5 h-5" />,
//       href: "/materials",
//       badge: 24,
//     },
//     {
//       id: "upload",
//       label: "Upload",
//       icon: <LuUpload className="w-5 h-5" />,
//       href: "/upload",
//     },
//     {
//       id: "favorites",
//       label: "Favorites",
//       icon: <LuStar className="w-5 h-5" />,
//       href: "/favorites",
//       badge: 8,
//     },
//     {
//       id: "analytics",
//       label: "Analytics",
//       icon: <LuBarChart className="w-5 h-5" />,
//       href: "/analytics",
//     },
//     {
//       id: "users",
//       label: "Users",
//       icon: <LuUsers className="w-5 h-5" />,
//       href: "/users",
//     },
//     {
//       id: "settings",
//       label: "Settings",
//       icon: <LuSettings className="w-5 h-5" />,
//       href: "/settings",
//     },
//   ];

//   return (
//     <div className="flex h-screen bg-gray-50">
//       {/* Sidebar */}
//       <Sidebar
//         items={sidebarItems}
//         logo={
//           <div className="flex items-center gap-2">
//             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
//               <span className="text-white font-bold">E</span>
//             </div>
//             <span className="font-bold text-xl text-gray-900">EduHub</span>
//           </div>
//         }
//         collapsed={sidebarCollapsed}
//         onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
//         user={{
//           name: "Emmanuel Okoro",
//           email: "emmanuel@edu.com",
//           avatar: "/avatar.jpg",
//           role: "Student",
//         }}
//       />

//       {/* Main Content */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         <HeaderBar
//           title="Dashboard"
//           user={{
//             name: "Emmanuel Okoro",
//             email: "emmanuel@edu.com",
//             avatar: "/avatar.jpg",
//           }}
//           onSearch={(query) => console.log(query)}
//           notifications={[]}
//         />
//         <main className="flex-1 overflow-y-auto p-6">{children}</main>
//       </div>
//     </div>
//   );
// }
// 7. With onClick Instead of href
// tsxconst sidebarItems = [
//   {
//     id: "dashboard",
//     label: "Dashboard",
//     icon: <LuHome className="w-5 h-5" />,
//     onClick: () => router.push("/dashboard"),
//   },
//   {
//     id: "logout",
//     label: "Logout",
//     icon: <LuLogOut className="w-5 h-5" />,
//     onClick: handleLogout,
//   },
// ];