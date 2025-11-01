// assets/data/imageData.ts

import type { StaticImageData } from "next/image";
import { Avatar1, Avatar2, Avatar3, Avatar4, Avatar5, Avatar6, Blog1, Blog2, Blog3, Blog4, Blog5, Blog6, FooterBG1, FooterBG2, Gallery1, Gallery2, Gallery3, SectionBG1 } from "../img";


export type ImageSource = string | StaticImageData;

export type ImageCategory =
  | "avatar"
  | "post"
  | "blog"
  | "background"
  | "icon"
  | "banner";

export interface ImageAsset {
  id: string;
  src: ImageSource;
  alt: string;
  category: ImageCategory;
  tags?: string[];
}

// User avatars
export const AVATAR_IMAGES: ImageAsset[] = [
  {
    id: "avatar-1",
    src: Avatar1,
    alt: "Profile avatar of a young woman with glasses",
    category: "avatar",
    tags: ["female", "professional", "student"],
  },
  {
    id: "avatar-2",
    src: Avatar2,
    alt: "Profile avatar of a man with beard",
    category: "avatar",
    tags: ["male", "teacher", "professional"],
  },
  {
    id: "avatar-3",
    src: Avatar3,
    alt: "Profile avatar of a woman with curly hair",
    category: "avatar",
    tags: ["female", "student"],
  },
  {
    id: "avatar-4",
    src: Avatar4,
    alt: "Profile avatar of a man with glasses",
    category: "avatar",
    tags: ["male", "student"],
  },
  {
    id: "avatar-5",
    src: Avatar5,
    alt: "Profile avatar of a woman with short hair",
    category: "avatar",
    tags: ["female", "teacher", "professional"],
  },
  {
    id: "avatar-default",
    src: Avatar6,
    alt: "Default profile avatar",
    category: "avatar",
    tags: ["default", "neutral"],
  },
];

// Blog and post images
export const CONTENT_IMAGES: ImageAsset[] = [
  {
    id: "blog-tech-1",
    src: Blog1,
    alt: "Modern tech workspace with multiple screens",
    category: "blog",
    tags: ["technology", "workspace", "professional"],
  },
  {
    id: "blog-code-1",
    src: Blog2,
    alt: "Computer screen showing code",
    category: "blog",
    tags: ["code", "programming", "development"],
  },
  {
    id: "blog-meeting-1",
    src: Blog3,
    alt: "Team meeting in modern office",
    category: "blog",
    tags: ["team", "meeting", "collaboration"],
  },
  {
    id: "post-design-1",
    src: Blog4,
    alt: "Design mockup on tablet",
    category: "post",
    tags: ["design", "ux", "creative"],
  },
  {
    id: "post-mobile-1",
    src: Blog5,
    alt: "Mobile app interface on smartphone",
    category: "post",
    tags: ["mobile", "app", "interface"],
  },
  {
    id: "post-event-1",
    src: Blog6,
    alt: "Students at campus event",
    category: "post",
    tags: ["campus", "event", "student"],
  },
];

// Background images
export const BACKGROUND_IMAGES: ImageAsset[] = [
  {
    id: "bg-pattern-1",
    src: FooterBG1,
    alt: "Abstract geometric pattern background",
    category: "background",
    tags: ["pattern", "abstract", "light"],
  },
  {
    id: "bg-gradient-1",
    src: FooterBG2,
    alt: "Soft color gradient background",
    category: "background",
    tags: ["gradient", "soft", "colorful"],
  },
  {
    id: "bg-campus-1",
    src: SectionBG1,
    alt: "University campus background",
    category: "background",
    tags: ["campus", "education", "outdoor"],
  },
];

// Banner images
export const BANNER_IMAGES: ImageAsset[] = [
  {
    id: "banner-welcome",
    src: Gallery1,
    alt: "Welcome to the platform banner",
    category: "banner",
    tags: ["welcome", "intro", "feature"],
  },
  {
    id: "banner-event",
    src: Gallery2,
    alt: "Upcoming events banner",
    category: "banner",
    tags: ["event", "announcement", "upcoming"],
  },
  {
    id: "banner-course",
    src: Gallery3,
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
