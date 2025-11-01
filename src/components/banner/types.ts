import { ImageSource } from "@/assets/data/imagesData";

export interface BannerData {
  id: string;
  type: "welcome" | "featured-course" | "update" | "achievement" | "ad";
  title?: string;
  description?: string;
  image?: ImageSource;
  icon?: React.ReactNode;
  cta?: {
    text: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
  };
  badge?: string;
  metadata?: Record<string, unknown>;
}

export interface BannerItemProps {
  data: BannerData | BannerData[];
  className?: string;
  autoRotate?: boolean;
  autoRotateInterval?: number; // milliseconds (default: 5000)
}

export interface BannerSectionProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}
