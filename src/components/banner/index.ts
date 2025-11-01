// import { FadeInOut, SlideUp, SlideInLeft } from "@/components/bannerSection";
// import { Banner1, Banner2, Banner3, Banner4 } from "@/components/bannerItem";
// import { BannerData } from "@/components/banner/types";

// const welcomeData: BannerData = {
//   id: "welcome-1",
//   type: "welcome",
//   title: "Welcome to Uni Archive",
//   description:
//     "Your comprehensive platform for academic resources, courses, and community learning.",
//   image: "/images/welcome-hero.jpg",
//   badge: "NEW",
//   cta: {
//     text: "Start Learning",
//     href: "/courses",
//     variant: "primary",
//   },
// };

// const featuredCourseData: BannerData = {
//   id: "course-1",
//   type: "featured-course",
//   title: "Master Web Development",
//   description:
//     "Learn React, Node.js, and modern web technologies from industry experts.",
//   badge: "FEATURED",
//   icon: "🚀",
//   cta: {
//     text: "Enroll Now",
//     href: "/courses/web-dev",
//     variant: "outline",
//   },
// };

// const updateData: BannerData = {
//   id: "update-1",
//   type: "update",
//   title: "New Features Released",
//   description: "Check out the latest improvements to your learning experience.",
//   image: "/images/update-banner.jpg",
//   cta: {
//     text: "Learn More",
//     href: "/updates",
//   },
// };

// export default function Home() {
//   return (
//     <div className="space-y-12 p-6 md:p-12">
//       {/* Hero Banner with Fade Animation */}
//       <FadeInOut duration={0.8}>
//         <Banner4 data={welcomeData} />
//       </FadeInOut>

//       {/* Featured Course Banner with Slide Up */}
//       <SlideUp duration={0.6} delay={0.2}>
//         <Banner2 data={featuredCourseData} />
//       </SlideUp>

//       {/* Update Banner with Slide In Left */}
//       <SlideInLeft duration={0.7} delay={0.3}>
//         <Banner1 data={updateData} />
//       </SlideInLeft>

//       {/* Compact Update Banner */}
//       <FadeInOut duration={0.6} delay={0.4}>
//         <Banner3 data={updateData} />
//       </FadeInOut>
//     </div>
//   );
// }
