// assets/data/blogData.ts
import { getImageByID, type ImageAsset } from "./imagesData";

export type BlogType = "platform" | "teacher" | "student";
export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";
export type UserRole = "admin" | "teacher" | "student" | "guest";



export interface User {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  avatarId: string;
  bio?: string;
  joinDate: string;
  isOnline?: boolean;
  lastActive?: string;
}

export interface Comment {
  id: number;
  blogId: number;
  userId: number;
  parentId?: number; // For nested comments/replies
  content: string;
  date: string;
  likes: number;
  userReactions: Record<number, ReactionType>; // userId to reaction
  replies?: number[]; // Array of reply comment IDs
}

export interface BlogPost {
  id: number;
  type: BlogType;
  title: string;
  excerpt: string;
  date: string;
  imageIds: string[];
  author: string;
  authorId: number; // Reference to user ID
  tags: string[];
  content: string;
  likes: number;
  shares: number;
  comments: number; // Total count
  commentIds: number[]; // References to comment IDs
  reactions: Record<ReactionType, number>;
}

// Sample users data
export const USERS_DATA: User[] = [
  {
    id: 1,
    username: "sarahjohnson",
    displayName: "Sarah Johnson",
    role: "teacher",
    avatarId: "avatar-1",
    bio: "Web development instructor specializing in modern JavaScript frameworks",
    joinDate: "2023-01-15",
    isOnline: true,
    lastActive: "2024-03-15T10:30:00Z"
  },
  {
    id: 2,
    username: "michaelchen",
    displayName: "Michael Chen",
    role: "teacher",
    avatarId: "avatar-2",
    bio: "Technology researcher and educator with focus on emerging tech trends",
    joinDate: "2023-02-10",
    isOnline: false,
    lastActive: "2024-03-14T16:45:00Z"
  },
  {
    id: 3,
    username: "emmawilson",
    displayName: "Emma Wilson",
    role: "teacher",
    avatarId: "avatar-5",
    bio: "TypeScript enthusiast and software engineering professor",
    joinDate: "2022-11-05",
    isOnline: true,
    lastActive: "2024-03-15T09:15:00Z"
  },
  {
    id: 4,
    username: "davidmartinez",
    displayName: "David Martinez",
    role: "student",
    avatarId: "avatar-4",
    bio: "Front-end development student with passion for CSS and design",
    joinDate: "2023-05-20",
    isOnline: false,
    lastActive: "2024-03-13T20:10:00Z"
  },
  {
    id: 5,
    username: "lindathompson",
    displayName: "Linda Thompson",
    role: "admin",
    avatarId: "avatar-3",
    bio: "Platform administrator and accessibility advocate",
    joinDate: "2022-08-01",
    isOnline: true,
    lastActive: "2024-03-15T11:45:00Z"
  },
  {
    id: 6,
    username: "robertwilliams",
    displayName: "Robert Williams",
    role: "teacher",
    avatarId: "avatar-2",
    bio: "Expert in frontend architecture with 10+ years of industry experience",
    joinDate: "2023-01-10",
    isOnline: false,
    lastActive: "2024-03-14T15:30:00Z"
  },
];

// Comments data
export const COMMENTS_DATA: Comment[] = [
  {
    id: 1,
    blogId: 1,
    userId: 4, // David Martinez
    content: "This guide really helped me understand server-side rendering in Next.js. Thanks for sharing!",
    date: "2024-03-15T14:30:00Z",
    likes: 5,
    userReactions: {
      2: "like",
      3: "like",
      5: "love",
      6: "like"
    }
  },
  {
    id: 2,
    blogId: 1,
    userId: 3, // Emma Wilson
    content: "Great overview! I'd add that understanding the Next.js data fetching methods is crucial for optimizing performance.",
    date: "2024-03-15T16:15:00Z",
    likes: 3,
    userReactions: {
      1: "like",
      4: "like",
      5: "like"
    }
  },
  {
    id: 3,
    blogId: 1,
    userId: 2, // Michael Chen
    parentId: 2, // Reply to Emma's comment
    content: "Absolutely agree. The getStaticProps and getServerSideProps functions are game changers.",
    date: "2024-03-15T17:20:00Z",
    likes: 2,
    userReactions: {
      3: "like",
      4: "like"
    },
    replies: [7]
  },
  {
    id: 4,
    blogId: 2,
    userId: 5, // Linda Thompson
    content: "The AI integration predictions are spot on. I'm particularly excited about the advances in natural language processing within web apps.",
    date: "2024-03-14T13:45:00Z",
    likes: 4,
    userReactions: {
      1: "like",
      2: "like",
      3: "love",
      6: "like"
    }
  },
  {
    id: 5,
    blogId: 2,
    userId: 6, // Robert Williams
    content: "WebAssembly is definitely going to be transformative. I've been experimenting with it in a few projects and the performance gains are impressive.",
    date: "2024-03-14T14:30:00Z",
    likes: 3,
    userReactions: {
      1: "like",
      2: "wow",
      5: "like"
    }
  },
  {
    id: 6,
    blogId: 3,
    userId: 4, // David Martinez
    content: "I've been implementing some of these TypeScript practices in my projects and it's made debugging so much easier.",
    date: "2024-03-13T15:10:00Z",
    likes: 2,
    userReactions: {
      3: "like",
      5: "like"
    }
  },
  {
    id: 7,
    blogId: 1,
    userId: 3, // Emma Wilson
    parentId: 3, // Reply to Michael's comment
    content: "Yes, and incremental static regeneration is another powerful feature that deserves attention!",
    date: "2024-03-15T18:05:00Z",
    likes: 1,
    userReactions: {
      2: "like"
    }
  },
  {
    id: 8,
    blogId: 3,
    userId: 1, // Sarah Johnson
    content: "Great article! Type inference in TypeScript is actually smarter than many developers realize.",
    date: "2024-03-13T16:40:00Z",
    likes: 3,
    userReactions: {
      3: "like",
      4: "like",
      6: "like"
    }
  }
];

// Update the BLOG_DATA to include authorId and commentIds
export const BLOG_DATA: BlogPost[] = [
  {
    id: 1,
    type: "platform",
    title: "Mastering Next.js: A Comprehensive Guide",
    excerpt:
      "Discover advanced techniques for building scalable applications with Next.js. Learn about SSR, SSG, and API routes.",
    date: "2024-03-15",
    imageIds: ["blog-tech-1", "blog-code-1"],
    author: "Sarah Johnson",
    authorId: 1,
    tags: ["Web Development", "Next.js", "TypeScript"],
    content: `
Next.js has become one of the most popular React frameworks for building production-ready applications. This comprehensive guide will walk you through advanced techniques to leverage Next.js effectively.

## Server-Side Rendering (SSR)

Next.js simplifies server-side rendering with the getServerSideProps function:

\`\`\`typescript
export async function getServerSideProps(context) {
  const data = await fetchData(context.params.id);
  return {
    props: { data }
  }
}
\`\`\`

This approach ensures your page has the latest data on every request, making it ideal for dynamic content.

## Static Site Generation (SSG)

For content that doesn't change frequently, static generation provides excellent performance:

\`\`\`typescript
export async function getStaticProps() {
  const posts = await fetchPosts();
  return {
    props: { posts },
    revalidate: 3600 // Regenerate page every hour
  }
}
\`\`\`

## API Routes

Next.js allows you to build your API within the same project:

\`\`\`typescript
// pages/api/user.ts
export default function handler(req, res) {
  if (req.method === 'POST') {
    // Handle POST request
  } else {
    // Handle other methods
  }
}
\`\`\`

This approach simplifies your architecture by keeping frontend and backend code together.

## Image Optimization

The Next.js Image component automatically optimizes images for performance:

\`\`\`typescript
import Image from 'next/image'

function MyComponent() {
  return (
    <Image
      src="/profile.jpg"
      width={500}
      height={300}
      alt="Profile picture"
    />
  )
}
\`\`\`

By implementing these techniques, you'll be able to build highly performant, scalable applications with Next.js.
    `,
    likes: 42,
    shares: 12,
    comments: 4,
    commentIds: [1, 2, 3, 7],
    reactions: {
      like: 30,
      love: 10,
      haha: 1,
      wow: 1,
      sad: 0,
      angry: 0,
    },
  },
  {
    id: 2,
    type: "platform",
    title: "The Future of Web Development: 2024 Trends",
    excerpt:
      "Explore the latest trends shaping web development, from AI integration to WebAssembly advancements.",
    date: "2024-03-14",
    imageIds: ["blog-meeting-1", "post-design-1"],
    author: "Michael Chen",
    authorId: 2,
    tags: ["Technology", "Trends", "Web Development"],
    content: `
As we progress through 2024, several key trends are reshaping the landscape of web development. Understanding these trends is crucial for developers looking to stay ahead of the curve.

## AI Integration in Web Applications

Artificial intelligence is no longer just a buzzword—it's becoming an integral part of web applications. From smart content recommendations to natural language interfaces, AI is enhancing user experiences in unprecedented ways.

## WebAssembly Evolution

WebAssembly (Wasm) continues to gain traction, allowing developers to run high-performance code in the browser. This technology is enabling more complex applications to run efficiently on the web, from video editing tools to advanced data visualization.

## Edge Computing

The shift toward edge computing is transforming how web applications are deployed and scaled. By processing data closer to where it's needed, edge computing reduces latency and improves performance.

## CSS Container Queries

Container queries represent a significant advancement in responsive design, allowing elements to adapt based on their parent container rather than just the viewport. This enables more flexible and maintainable component-based designs.

## HTTP/3 and QUIC

The adoption of HTTP/3 and QUIC protocols is improving web performance, particularly for users on unreliable networks. These technologies reduce connection setup times and provide better handling of packet loss.

## Sustainability in Web Development

Environmental considerations are increasingly influencing web development practices. From optimizing for energy efficiency to reducing data transfer, sustainable web development is becoming a priority.

By embracing these trends, developers can create more powerful, efficient, and user-friendly web experiences in 2024 and beyond.
    `,
    likes: 40,
    shares: 10,
    comments: 2,
    commentIds: [4, 5],
    reactions: {
      like: 29,
      love: 9,
      haha: 1,
      wow: 1,
      sad: 0,
      angry: 0,
    },
  },
  {
    id: 3,
    type: "platform",
    title: "TypeScript Best Practices for Clean Code",
    excerpt:
      "Learn how to write maintainable and type-safe code with these TypeScript pro tips.",
    date: "2024-03-13",
    imageIds: ["post-mobile-1", "post-design-1"],
    author: "Emma Wilson",
    authorId: 3,
    tags: ["TypeScript", "Programming", "Best Practices"],
    content: `
TypeScript has transformed how developers write and maintain JavaScript code. Here are best practices to help you write cleaner, more maintainable TypeScript code.

## Leverage Type Inference

While TypeScript allows explicit type annotations, it's often better to let the compiler infer types when possible:

\`\`\`typescript
// Instead of this:
const numbers: number[] = [1, 2, 3];

// Do this:
const numbers = [1, 2, 3]; // TypeScript infers number[]
\`\`\`

This reduces verbosity while maintaining type safety.

## Use Interfaces for Object Shapes

Interfaces provide a clear way to define object shapes:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  active?: boolean; // Optional property
}

function getUserInfo(user: User) {
  // Implementation
}
\`\`\`

## Discriminated Unions for Complex Types

When dealing with related types that differ in structure, use discriminated unions:

\`\`\`typescript
interface Success {
  status: 'success';
  data: string[];
}

interface Error {
  status: 'error';
  message: string;
}

type ApiResponse = Success | Error;

function handleResponse(response: ApiResponse) {
  if (response.status === 'success') {
    // TypeScript knows we have a Success type
    console.log(response.data.length);
  } else {
    // TypeScript knows we have an Error type
    console.error(response.message);
  }
}
\`\`\`

## Readonly Modifiers for Immutability

Use \\\`readonly\\\` to enforce immutability:

\`\`\`typescript
interface Config {
  readonly apiKey: string;
  readonly endpoint: string;
}

const config: Config = {
  apiKey: 'abc123',
  endpoint: '/api/v1'
};

// This would cause a TypeScript error:
// config.apiKey = 'new-key';
\`\`\`

## Strict Null Checks

Enable \\\`strictNullChecks\\\` in your tsconfig.json to catch potential null or undefined values:

\`\`\`typescript
function getLength(text: string | null) {
  // This would error with strictNullChecks enabled
  // return text.length;
  
  // Do this instead:
  return text ? text.length : 0;
}
\`\`\`

By following these practices, you'll write more maintainable, bug-resistant TypeScript code that scales well as your project grows.
`,
    likes: 42,
    shares: 12,
    comments: 2,
    commentIds: [6, 8],
    reactions: {
      like: 30,
      love: 10,
      haha: 1,
      wow: 1,
      sad: 0,
      angry: 0,
    },
  },
  {
    id: 4,
    type: "platform",
    title: "Responsive Design with Tailwind CSS",
    excerpt:
      "Create beautiful responsive layouts using Tailwind CSS utility-first approach.",
    date: "2024-03-12",
    imageIds: ["post-design-1", "blog-code-1"],
    author: "David Martinez",
    authorId: 4,
    tags: ["CSS", "Tailwind", "Frontend"],
    content:
      "Tailwind CSS has revolutionized how we approach responsive design with its utility-first methodology. Rather than writing custom CSS, developers can compose designs directly in their markup using predefined utility classes. This article explores best practices for creating responsive layouts with Tailwind.",
    likes: 42,
    shares: 12,
    comments: 0,
    commentIds: [],
    reactions: {
      like: 30,
      love: 10,
      haha: 1,
      wow: 1,
      sad: 0,
      angry: 0,
    },
  },
  {
    id: 5,
    type: "platform",
    title: "Building Accessible Web Applications",
    excerpt:
      "Essential tips for creating web applications that are accessible to everyone.",
    date: "2024-03-11",
    imageIds: ["post-event-1", "blog-meeting-1"],
    author: "Linda Thompson",
    authorId: 5,
    tags: ["Accessibility", "Web Standards", "Inclusion"],
    content:
      "Web accessibility is not just a legal requirement in many countries—it's a fundamental aspect of ethical web development. This article covers practical strategies for making your web applications accessible to users with various disabilities, including visual, auditory, motor, and cognitive impairments.",
    likes: 42,
    shares: 12,
    comments: 0,
    commentIds: [],
    reactions: {
      like: 30,
      love: 10,
      haha: 1,
      wow: 1,
      sad: 0,
      angry: 0,
    },
  },
  {
    id: 6,
    type: "platform",
    title: "Modern Frontend Architecture Patterns",
    excerpt:
      "Explore different architectural approaches for large-scale frontend applications.",
    date: "2024-03-10",
    imageIds: ["blog-code-1", "blog-tech-1"],
    author: "Robert Williams",
    authorId: 6,
    tags: ["Architecture", "Frontend", "Scalability"],
    content:
      "As frontend applications grow in complexity, choosing the right architectural pattern becomes increasingly important. This article examines modern approaches such as Component-Based Architecture, Micro-Frontends, and State Management patterns, helping you select the best approach for your specific project requirements.",
    likes: 42,
    shares: 12,
    comments: 0,
    commentIds: [],
    reactions: {
      like: 30,
      love: 10,
      haha: 1,
      wow: 1,
      sad: 0,
      angry: 0,
    },
  },
];

// Helper functions for working with blog data
export const getBlogCommentsById = (blogId: number): Comment[] => {
  return COMMENTS_DATA.filter(comment => comment.blogId === blogId && !comment.parentId);
};

export const getCommentRepliesById = (commentId: number): Comment[] => {
  return COMMENTS_DATA.filter(comment => comment.parentId === commentId);
};

export const getUserById = (userId: number): User | undefined => {
  return USERS_DATA.find(user => user.id === userId);
};

export const getBlogsByUserId = (userId: number): BlogPost[] => {
  return BLOG_DATA.filter(blog => blog.authorId === userId);
};

// Helper function to get actual image sources from image IDs
export const getBlogImages = (imageIds: string[]): ImageAsset[] => {
  return imageIds
    .map(id => getImageByID(id))
    .filter((img): img is ImageAsset => img !== undefined);
};

import { BannerData } from "@/components/banner/types";
import  { SearchSuggestion } from "@/components/reuse/searchbar"
import { About1, About2, Avatar1, Avatar2, Avatar3, Avatar4, Avatar5, Avatar6, Avatar7, Featured1, Gallery1, Gallery2, Gallery3, Gallery4, Gallery5, Gallery6, Gallery7, Gallery8, Gallery9 } from "../img";

export const activities = [
  {
    id: "1",
    type: "enrollment" as const,
    user: {
      name: "John Doe",
      avatar: Avatar1,
    },
    title: "Enrolled in Introduction to Algorithms",
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    type: "completion" as const,
    user: {
      name: "Jane Smith",
      avatar: Avatar2,
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
      avatar: Avatar3,
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
      avatar: Avatar4,
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
      avatar: Avatar5,
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
      avatar: Avatar6,
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
      avatar: Avatar7,
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
    image: Gallery1,
    badge: "NEW",
    cta: {
      text: "Get Started",
      href: "/auth?view=signup",
      variant: "primary",
    },
  },
  {
    id: "welcome-2",
    type: "welcome",
    title: "Empower Your Learning Journey",
    description:
      "Discover thousands of study materials shared by top students and tutors.",
    image: Gallery2,
    cta: {
      text: "Browse Materials",
      href: "/auth?view=signin",
      variant: "secondary",
    },
  },
  {
    id: "welcome-3",
    type: "welcome",
    title: "Stay Ahead With Uni Archive",
    description:
      "Get early access to newly uploaded notes, assignments, and exam past questions.",
    image: Gallery3,
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
    image: Gallery4,
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
    image: Gallery5,
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
    image: Gallery6,
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
    image: Gallery7,
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
    image: Gallery8,
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
    image: Gallery9,
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
    image: About1.src,
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
    image: About2.src,
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
    image: Featured1.src,
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
    image: Avatar1.src,
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
    image: Avatar2.src,
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