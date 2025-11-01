import { BannerData } from "@/components/banner/types";
import  { SearchSuggestion } from "@/components/reuse/searchbar"

export const activities = [
  {
    id: "1",
    type: "enrollment" as const,
    user: {
      name: "John Doe",
      avatar: "/john.jpg",
    },
    title: "Enrolled in Introduction to Algorithms",
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    type: "completion" as const,
    user: {
      name: "Jane Smith",
      avatar: "/jane.jpg",
    },
    title: "Completed Data Structures Course",
    description: "Scored 95% on the final exam",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    metadata: {
      points: 500,
      course: "CS 201",
    },
  },
];

export const fullActivities = [
  {
    id: "1",
    type: "achievement" as const,
    user: {
      name: "Emmanuel Okoro",
      avatar: "/emmanuel.jpg",
    },
    title: "Earned 'Algorithm Master' Badge",
    description: "Completed all algorithm courses with perfect scores",
    timestamp: new Date().toISOString(),
    metadata: {
      points: 1000,
      category: "Algorithms",
      level: "Advanced",
    },
  },
  {
    id: "2",
    type: "upload" as const,
    user: {
      name: "Sarah Williams",
      avatar: "/sarah.jpg",
    },
    title: "Uploaded new study material",
    description: "CS 301 - Final Exam Preparation Notes",
    target: "Computer Science Department",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    metadata: {
      course: "CS 301",
      category: "Notes",
    },
  },
  {
    id: "3",
    type: "comment" as const,
    user: {
      name: "Mike Johnson",
      avatar: "/mike.jpg",
    },
    title: "Commented on your assignment",
    description: "Great work! Your implementation is very efficient.",
    target: "Binary Search Trees Assignment",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "4",
    type: "enrollment" as const,
    user: {
      name: "Lisa Chen",
      avatar: "/lisa.jpg",
    },
    title: "Enrolled in Machine Learning Basics",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    metadata: {
      course: "ML 101",
      level: "Beginner",
    },
  },
  {
    id: "5",
    type: "completion" as const,
    user: {
      name: "Tom Brown",
      avatar: "/tom.jpg",
    },
    title: "Completed Web Development Course",
    description: "Built 5 projects including a full-stack application",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    metadata: {
      points: 750,
      course: "WEB 301",
      level: "Intermediate",
    },
  },
];

export const welcomeBanners: BannerData[] = [
  {
    id: "welcome-1",
    type: "welcome",
    title: "Welcome to Uni Archive",
    description:
      "Your all-in-one academic resource hub for materials, courses, and community discussions.",
    image: "/images/welcome-hero.jpg",
    badge: "NEW",
    cta: {
      text: "Get Started",
      href: "/explore",
      variant: "primary",
    },
  },
  {
    id: "welcome-2",
    type: "welcome",
    title: "Empower Your Learning Journey",
    description:
      "Discover thousands of study materials shared by top students and tutors.",
    image: "/images/welcome-learning.jpg",
    cta: {
      text: "Browse Materials",
      href: "/materials",
      variant: "secondary",
    },
  },
  {
    id: "welcome-3",
    type: "welcome",
    title: "Stay Ahead With Uni Archive",
    description:
      "Get early access to newly uploaded notes, assignments, and exam past questions.",
    image: "/images/welcome-update.jpg",
    badge: "HOT",
    cta: {
      text: "Join Community",
      href: "/community",
      variant: "outline",
    },
  },
];

export const featuredCourseBanners: BannerData[] = [
  {
    id: "course-1",
    type: "featured-course",
    title: "Master Web Development",
    description:
      "Learn HTML, CSS, JavaScript, and modern frameworks like React and Next.js.",
    badge: "FEATURED",
    icon: "💻",
    cta: {
      text: "Enroll Now",
      href: "/courses/web-dev",
      variant: "primary",
    },
  },
  {
    id: "course-2",
    type: "featured-course",
    title: "Data Science Bootcamp",
    description:
      "From Python to machine learning — gain practical skills with real datasets.",
    badge: "TRENDING",
    icon: "📊",
    cta: {
      text: "Start Learning",
      href: "/courses/data-science",
      variant: "secondary",
    },
  },
  {
    id: "course-3",
    type: "featured-course",
    title: "Cyber Security Fundamentals",
    description:
      "Protect systems from vulnerabilities and learn ethical hacking.",
    badge: "HOT",
    icon: "🛡️",
    cta: {
      text: "Secure Your Spot",
      href: "/courses/cyber-security",
      variant: "outline",
    },
  },
];

export const updateBanners: BannerData[] = [
  {
    id: "update-1",
    type: "update",
    title: "New Upload System Released",
    description: "You can now drag & drop multiple materials at once.",
    image: "/images/update-upload.jpg",
    cta: {
      text: "Learn More",
      href: "/updates/upload-system",
      variant: "primary",
    },
  },
  {
    id: "update-2",
    type: "update",
    title: "Dark Mode Is Here",
    description: "Switch themes easily from your profile settings.",
    image: "/images/update-darkmode.jpg",
    badge: "BETA",
    cta: {
      text: "Try It",
      href: "/updates/dark-mode",
      variant: "secondary",
    },
  },
  {
    id: "update-3",
    type: "update",
    title: "Community Forum Improved",
    description: "Experience faster load times and new tagging options.",
    image: "/images/update-community.jpg",
    cta: {
      text: "Check It Out",
      href: "/community",
      variant: "outline",
    },
  },
];

export const achievementBanners: BannerData[] = [
  {
    id: "achieve-1",
    type: "achievement",
    title: "Top Contributor of the Week",
    description: "Kelechi Okafor uploaded 15 verified materials this week 🎉",
    icon: "🏅",
    badge: "WEEKLY WINNER",
    cta: {
      text: "View Profile",
      href: "/user/kelechi-okafor",
      variant: "primary",
    },
  },
  {
    id: "achieve-2",
    type: "achievement",
    title: "Community Helper",
    description: "You’ve answered 50+ student questions in the forum.",
    icon: "🤝",
    badge: "GOLD",
    cta: {
      text: "Keep Helping",
      href: "/community",
      variant: "secondary",
    },
  },
  {
    id: "achieve-3",
    type: "achievement",
    title: "5K Active Users",
    description:
      "Uni Archive has reached a milestone — thank you for being part of our journey!",
    icon: "🎊",
    badge: "MILESTONE",
    cta: {
      text: "Celebrate With Us",
      href: "/updates/5k-users",
      variant: "outline",
    },
  },
];

export const advertisementBanners: BannerData[] = [
  {
    id: "ad-1",
    type: "ad",
    title: "Get 20% Off on Premium Plans",
    description:
      "Upgrade your account to access advanced analytics and unlimited uploads.",
    image: "/images/ad-premium.jpg",
    badge: "LIMITED OFFER",
    cta: {
      text: "Upgrade Now",
      href: "/pricing",
      variant: "primary",
    },
  },
  {
    id: "ad-2",
    type: "ad",
    title: "Partner With Uni Archive",
    description:
      "Reach thousands of students and educators by promoting your brand.",
    image: "/images/ad-partner.jpg",
    cta: {
      text: "Contact Us",
      href: "/contact",
      variant: "secondary",
    },
  },
  {
    id: "ad-3",
    type: "ad",
    title: "Study Smarter with PandaNotes",
    description:
      "Get organized with AI-generated summaries from your uploaded materials.",
    image: "/images/ad-pandanotes.jpg",
    badge: "NEW",
    cta: {
      text: "Try Free",
      href: "/tools/pandanotes",
      variant: "outline",
    },
  },
];

export const randomBanners = [
  ...welcomeBanners,
  ...featuredCourseBanners,
  ...updateBanners,
  ...achievementBanners,
  ...advertisementBanners,
];

// Mock data
export const mockCourses: SearchSuggestion[] = [
  {
    id: "course-1",
    title: "Introduction to React",
    description: "Learn the basics of React and build interactive UIs",
    type: "course",
    image: "/courses/react.jpg",
    metadata: {
      level: "Beginner",
      instructor: "John Doe",
      students: 1250,
    },
  },
  {
    id: "course-2",
    title: "Advanced React Patterns",
    description: "Master advanced React patterns and best practices",
    type: "course",
    image: "/courses/react-advanced.jpg",
    metadata: {
      level: "Advanced",
      instructor: "Jane Smith",
      students: 450,
    },
  },
  {
    id: "course-3",
    title: "Node.js Backend Development",
    description: "Build scalable backend applications with Node.js",
    type: "course",
    metadata: {
      level: "Intermediate",
      instructor: "Mike Johnson",
      students: 890,
    },
  },
];

export const mockLessons: SearchSuggestion[] = [
  {
    id: "lesson-1",
    title: "Understanding Components",
    description: "Deep dive into React components and their lifecycle",
    type: "lesson",
    metadata: {
      course: "Introduction to React",
      duration: 45,
    },
  },
  {
    id: "lesson-2",
    title: "State Management with Redux",
    description: "Learn how to manage application state effectively",
    type: "lesson",
    metadata: {
      course: "Advanced React Patterns",
      duration: 60,
    },
  },
];

export const mockInstructors: SearchSuggestion[] = [
  {
    id: "instructor-1",
    title: "John Doe",
    description: "React and Frontend Development Expert",
    type: "instructor",
    image: "/instructors/john.jpg",
    metadata: {
      expertise: "Frontend",
      courses: 5,
      students: 3200,
    },
  },
  {
    id: "instructor-2",
    title: "Jane Smith",
    description: "Full Stack Developer and Mentor",
    type: "instructor",
    image: "/instructors/jane.jpg",
    metadata: {
      expertise: "Full Stack",
      courses: 8,
      students: 4500,
    },
  },
];

export const mockCategories: SearchSuggestion[] = [
  {
    id: "category-1",
    title: "Web Development",
    description: "Explore frontend and backend web development courses",
    type: "category",
    metadata: {
      courses: 24,
      students: 15000,
    },
  },
  {
    id: "category-2",
    title: "Mobile Development",
    description: "Build iOS and Android applications",
    type: "category",
    metadata: {
      courses: 18,
      students: 8500,
    },
  },
];