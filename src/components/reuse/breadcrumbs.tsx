import { ReactElement } from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactElement;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: ReactElement | string;
  className?: string;
  maxItems?: number;
  showHome?: boolean;
}

export default function Breadcrumbs({
  items,
  separator = (
    <svg
      className="w-4 h-4 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  className = "",
  maxItems = 5,
  showHome = false,
}: BreadcrumbsProps) {
  // Add home item if requested
  const allItems = showHome ? [{ label: "Home", href: "/" }, ...items] : items;

  // Truncate if needed
  const shouldTruncate = allItems.length > maxItems;
  const visibleItems = shouldTruncate
    ? [
        allItems[0],
        { label: "...", truncated: true } as BreadcrumbItem & {
          truncated?: boolean;
        },
        ...allItems.slice(-2),
      ]
    : allItems;

  return (
    <nav
      className={`flex items-center flex-wrap gap-2 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isTruncated = "truncated" in item && item.truncated;

          return (
            <li key={index} className="flex items-center gap-2">
              {/* Separator */}
              {index > 0 && (
                <span
                  className="flex-shrink-0 text-gray-400"
                  aria-hidden="true"
                >
                  {separator}
                </span>
              )}

              {/* Breadcrumb Item */}
              {isTruncated ? (
                <span className="px-2 text-gray-500 text-sm">...</span>
              ) : item.href || item.onClick ? (
                item.href ? (
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium
                      transition-colors duration-200
                      ${
                        isLast
                          ? "text-gray-900 bg-gray-100 cursor-default pointer-events-none"
                          : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                      }
                    `}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0">{item.icon}</span>
                    )}
                    {item.label}
                  </Link>
                ) : (
                  <button
                    onClick={item.onClick}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium
                      transition-colors duration-200
                      ${
                        isLast
                          ? "text-gray-900 bg-gray-100 cursor-default"
                          : "text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                      }
                    `}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0">{item.icon}</span>
                    )}
                    {item.label}
                  </button>
                )
              ) : (
                <span
                  className={`
                    flex items-center gap-1.5 px-2 py-1 text-sm font-medium
                    ${
                      isLast
                        ? "text-gray-900 bg-gray-100 rounded-md"
                        : "text-gray-600"
                    }
                  `}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && (
                    <span className="flex-shrink-0">{item.icon}</span>
                  )}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


// Usage Example:
// 📖 Usage Examples:
// 1. Basic Breadcrumbs
// <Breadcrumbs
//   items={[
//     { label: "Home", href: "/" },
//     { label: "Courses", href: "/courses" },
//     { label: "Computer Science" },
//   ]}
// />
// 2. With Icons
// import { LuHome, LuBook, LuCode } from "react-icons/lu";

// <Breadcrumbs
//   items={[
//     { label: "Home", href: "/", icon: <LuHome /> },
//     { label: "Courses", href: "/courses", icon: <LuBook /> },
//     { label: "CS 301", icon: <LuCode /> },
//   ]}
// />
// 3. With Auto Home
// <Breadcrumbs
//   showHome
//   items={[
//     { label: "Courses", href: "/courses" },
//     { label: "Computer Science", href: "/courses/cs" },
//     { label: "CS 301" },
//   ]}
// />
// 4. With onClick Instead of href
// <Breadcrumbs
//   items={[
//     { label: "Dashboard", onClick: () => router.push("/dashboard") },
//     { label: "Materials", onClick: () => router.push("/materials") },
//     { label: "Current Material" },
//   ]}
// />
// 5. Custom Separator
// // String separator
// <Breadcrumbs
//   items={breadcrumbItems}
//   separator="/"
// />

// // Custom icon separator
// <Breadcrumbs
//   items={breadcrumbItems}
//   separator={<span className="text-gray-400">•</span>}
// />
// 6. Long Path (Auto Truncation)
// <Breadcrumbs
//   maxItems={4}
//   items={[
//     { label: "Home", href: "/" },
//     { label: "Courses", href: "/courses" },
//     { label: "Computer Science", href: "/courses/cs" },
//     { label: "Level 300", href: "/courses/cs/300" },
//     { label: "Semester 1", href: "/courses/cs/300/sem1" },
//     { label: "CS 301", href: "/courses/cs/300/sem1/cs301" },
//     { label: "Algorithms" },
//   ]}
// />
// // Result: Home > ... > CS 301 > Algorithms
// 7. Real-World Examples
// Course Page:
// import { LuHome, LuBookOpen, LuCode } from "react-icons/lu";

// <Breadcrumbs
//   items={[
//     { label: "Home", href: "/", icon: <LuHome /> },
//     { label: "Courses", href: "/courses", icon: <LuBookOpen /> },
//     { label: "Computer Science", href: "/courses/cs", icon: <LuCode /> },
//     { label: course.title },
//   ]}
// />
// Material Detail:
// <Breadcrumbs
//   showHome
//   items={[
//     { label: "Materials", href: "/materials" },
//     { label: material.department, href: `/materials/${material.deptId}` },
//     { label: material.category, href: `/materials/${material.deptId}/${material.categoryId}` },
//     { label: material.title },
//   ]}
// />
// User Profile:
// <Breadcrumbs
//   items={[
//     { label: "Dashboard", href: "/dashboard" },
//     { label: "Users", href: "/users" },
//     { label: user.name },
//   ]}
// />
// 8. With TopContent (Combined)
// <TopContent
//   title="Introduction to Algorithms"
//   subtitle="CS 301 - Fall 2024"
//   breadcrumbs={
//     <Breadcrumbs
//       showHome
//       items={[
//         { label: "Courses", href: "/courses" },
//         { label: "Computer Science", href: "/courses/cs" },
//         { label: "CS 301" },
//       ]}
//     />
//   }
//   action={<Button label="Enroll" />}
// />