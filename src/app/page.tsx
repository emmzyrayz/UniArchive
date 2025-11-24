// import {CardOne, CardTwo, CardThree} from "@/components/ui/card";
import React from "react";


import { Banner } from "@/components/banner";
import { TopDepartment } from "@/components/department";
import { TopFaculty } from "@/components/faculty";
import { TopCourse} from "@/components/courses";
import {TestimonialsSection} from "@/components/testimonial";
import { ScrollableLecturer } from "@/components/featuredLecturer";
import { StatsSection } from "@/components/statistic";
import { NewsletterCTA } from "@/components/newsletter";
import { ActivityFeed } from "@/components/activityfeed";
// import { DarkModeToggle } from "@/components/darkmode";
import { Leaderboard } from "@/components/leaderboardd";
import { MobileAppPromo } from "@/components/mobileapppromo";
import { HowItWorks } from "@/components/howitwork";

export default function Home() {
  return (
    <div className="flex flex-col item-center justify-center w-full h-full relative overflow-hidden">
      <Banner />
      <TopDepartment />
      <TopFaculty />
      <TopCourse />
      <TestimonialsSection />
      <ScrollableLecturer />
      <StatsSection />
      <NewsletterCTA />
      <ActivityFeed />
      <HowItWorks />
      <Leaderboard />
      <MobileAppPromo />
      {/* <DarkModeToggle /> */}
    </div>
  );
}