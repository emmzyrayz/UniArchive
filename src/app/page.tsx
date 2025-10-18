// import Image from "next/image";
"use client";

import { ActivityFeed } from "@/components/reuse";
// import { useState } from "react";



export default function Home() {
  const activities = [
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

  const fullActivities = [
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

  return (
    <div className="flex flex-col justify-center p-4 items-center gap-3">
      <ActivityFeed activities={activities} />

      <ActivityFeed
activities={fullActivities}
   title="What's Happening"
   emptyMessage="No activity to show yet"
   className="max-w-2xl"
   onItemClick={(activity) => {
     console.log("Activity clicked:", activity);
   }}
 />
    </div>
  );
}
