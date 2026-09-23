import { IconType } from "react-icons";
import {
  LuGithub,
  LuTwitter,
  LuLinkedin,
  LuFacebook,
  LuInstagram,
} from "react-icons/lu";

interface SocialLink {
  name: string;
  icon: IconType;
  href: string;
}

export interface RibbonItem {
  id: number;
  type: "alert" | "warning" | "trending" | "update" | "info" | "success";
  message: string;
}

// Simple data - no icons or colors defined here
export const ribbonData: RibbonItem[] = [
  {
    id: 1,
    type: "alert",
    message: "System maintenance scheduled for tonight at 10 PM",
  },
  {
    id: 2,
    type: "warning",
    message: "Important: Update your profile before the deadline",
  },
  {
    id: 3,
    type: "trending",
    message: "Trending: New AI course launches this week - Sign up now!",
  },
  {
    id: 4,
    type: "update",
    message: "Latest: Mobile app version 2.0 now available for download",
  },
  {
    id: 5,
    type: "info",
    message: "New feature: Download study materials directly to your device",
  },
  {
    id: 6,
    type: "success",
    message: "Successfully launched 50+ new courses this semester!",
  },
];

export const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "Courses", href: "/courses" },
      { label: "Materials", href: "/materials" },
      { label: "Community", href: "/community" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api", external: true },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Partners", href: "/partners" },
    ],
  },
];

export const socialLinks: SocialLink[] = [
  { name: "GitHub", icon: LuGithub, href: "https://github.com" },
  { name: "Twitter", icon: LuTwitter, href: "https://twitter.com" },
  { name: "LinkedIn", icon: LuLinkedin, href: "https://linkedin.com" },
  { name: "Facebook", icon: LuFacebook, href: "https://facebook.com" },
  { name: "Instagram", icon: LuInstagram, href: "https://instagram.com" },
];
