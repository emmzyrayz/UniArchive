// assets/data/imageData.ts

export type ImageCategory =
  | "avatar"
  | "post"
  | "blog"
  | "background"
  | "icon"
  | "banner";

export interface ImageAsset {
  id: string;
  src: string;
  alt: string;
  category: ImageCategory;
  tags?: string[];
}

// User avatars
export const AVATAR_IMAGES: ImageAsset[] = [
  {
    id: "avatar-1",
    src: "/images/avatars/avatar-1.jpg",
    alt: "Profile avatar of a young woman with glasses",
    category: "avatar",
    tags: ["female", "professional", "student"],
  },
  {
    id: "avatar-2",
    src: "/images/avatars/avatar-2.jpg",
    alt: "Profile avatar of a man with beard",
    category: "avatar",
    tags: ["male", "teacher", "professional"],
  },
  {
    id: "avatar-3",
    src: "/images/avatars/avatar-3.jpg",
    alt: "Profile avatar of a woman with curly hair",
    category: "avatar",
    tags: ["female", "student"],
  },
  {
    id: "avatar-4",
    src: "/images/avatars/avatar-4.jpg",
    alt: "Profile avatar of a man with glasses",
    category: "avatar",
    tags: ["male", "student"],
  },
  {
    id: "avatar-5",
    src: "/images/avatars/avatar-5.jpg",
    alt: "Profile avatar of a woman with short hair",
    category: "avatar",
    tags: ["female", "teacher", "professional"],
  },
  {
    id: "avatar-default",
    src: "/images/avatars/default-avatar.jpg",
    alt: "Default profile avatar",
    category: "avatar",
    tags: ["default", "neutral"],
  },
];

// Blog and post images
export const CONTENT_IMAGES: ImageAsset[] = [
  {
    id: "blog-tech-1",
    src: "/images/blog/tech-workspace.jpg",
    alt: "Modern tech workspace with multiple screens",
    category: "blog",
    tags: ["technology", "workspace", "professional"],
  },
  {
    id: "blog-code-1",
    src: "/images/blog/code-screen.jpg",
    alt: "Computer screen showing code",
    category: "blog",
    tags: ["code", "programming", "development"],
  },
  {
    id: "blog-meeting-1",
    src: "/images/blog/team-meeting.jpg",
    alt: "Team meeting in modern office",
    category: "blog",
    tags: ["team", "meeting", "collaboration"],
  },
  {
    id: "post-design-1",
    src: "/images/posts/design-mockup.jpg",
    alt: "Design mockup on tablet",
    category: "post",
    tags: ["design", "ux", "creative"],
  },
  {
    id: "post-mobile-1",
    src: "/images/posts/mobile-app.jpg",
    alt: "Mobile app interface on smartphone",
    category: "post",
    tags: ["mobile", "app", "interface"],
  },
  {
    id: "post-event-1",
    src: "/images/posts/campus-event.jpg",
    alt: "Students at campus event",
    category: "post",
    tags: ["campus", "event", "student"],
  },
];

// Background images
export const BACKGROUND_IMAGES: ImageAsset[] = [
  {
    id: "bg-pattern-1",
    src: "/images/backgrounds/pattern-1.jpg",
    alt: "Abstract geometric pattern background",
    category: "background",
    tags: ["pattern", "abstract", "light"],
  },
  {
    id: "bg-gradient-1",
    src: "/images/backgrounds/gradient-1.jpg",
    alt: "Soft color gradient background",
    category: "background",
    tags: ["gradient", "soft", "colorful"],
  },
  {
    id: "bg-campus-1",
    src: "/images/backgrounds/campus-1.jpg",
    alt: "University campus background",
    category: "background",
    tags: ["campus", "education", "outdoor"],
  },
];

// Banner images
export const BANNER_IMAGES: ImageAsset[] = [
  {
    id: "banner-welcome",
    src: "/images/banners/welcome-banner.jpg",
    alt: "Welcome to the platform banner",
    category: "banner",
    tags: ["welcome", "intro", "feature"],
  },
  {
    id: "banner-event",
    src: "/images/banners/event-banner.jpg",
    alt: "Upcoming events banner",
    category: "banner",
    tags: ["event", "announcement", "upcoming"],
  },
  {
    id: "banner-course",
    src: "/images/banners/course-banner.jpg",
    alt: "Featured courses banner",
    category: "banner",
    tags: ["course", "education", "feature"],
  },
];

// Helper functions to work with images
export const getImagesByCategory = (category: ImageCategory): ImageAsset[] => {
  switch (category) {
    case "avatar":
      return AVATAR_IMAGES;
    case "background":
      return BACKGROUND_IMAGES;
    case "banner":
      return BANNER_IMAGES;
    case "blog":
    case "post":
      return CONTENT_IMAGES.filter((img) => img.category === category);
    default:
      return [];
  }
};

export const getImageByID = (id: string): ImageAsset | undefined => {
  return [
    ...AVATAR_IMAGES,
    ...CONTENT_IMAGES,
    ...BACKGROUND_IMAGES,
    ...BANNER_IMAGES,
  ].find((img) => img.id === id);
};

export const getRandomImage = (category: ImageCategory): ImageAsset => {
  const images = getImagesByCategory(category);
  return images[Math.floor(Math.random() * images.length)];
};

// Export all images as a flat array
export const ALL_IMAGES: ImageAsset[] = [
  ...AVATAR_IMAGES,
  ...CONTENT_IMAGES,
  ...BACKGROUND_IMAGES,
  ...BANNER_IMAGES,
];
