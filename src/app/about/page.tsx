"use client";

import React from "react";
import {motion} from "framer-motion";
// import Image from "next/image";
import Link from "next/link";
import {
  LuBookOpen,
  LuCalendarClock,
  LuFilter,
  LuCircleCheck,
  LuArrowRight,
} from "react-icons/lu";

// Counter animation component
const AnimatedCounter: React.FC<{
  value: number;
  text: string;
  icon: React.ReactNode;
}> = ({value, text, icon}) => {
  return (
    <motion.div
      className="flex flex-col items-center p-6"
      initial={{opacity: 0, y: 20}}
      whileInView={{opacity: 1, y: 0}}
      transition={{duration: 0.5}}
      viewport={{once: true}}
    >
      <div className="text-blue-600 mb-4">{icon}</div>
      <motion.span
        className="text-4xl md:text-5xl font-bold text-gray-900"
        initial={{opacity: 0}}
        whileInView={{opacity: 1}}
        transition={{duration: 1.5}}
        viewport={{once: true}}
      >
        {value}+
      </motion.span>
      <span className="mt-2 text-gray-600 text-center">{text}</span>
    </motion.div>
  );
};

// Timeline item component
interface TimelineItemProps {
  year: string;
  title: string;
  description: string;
  isLeft: boolean;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  year,
  title,
  description,
  isLeft,
  isLast = false,
}) => {
  return (
    <div className="relative">
      {/* Vertical Line */}
      {!isLast && (
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-200"></div>
      )}

      {/* Timeline Dot */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600 z-10"></div>

      {/* Content */}
      <div
        className={`flex items-center justify-between w-full ${
          isLeft ? "flex-row" : "flex-row-reverse"
        }`}
      >
        <div
          className={`w-5/12 ${isLeft ? "text-right pr-8" : "text-left pl-8"}`}
        >
          <span className="inline-block py-1 px-3 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-2">
            {year}
          </span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <div className="w-5/12"></div>
      </div>
    </div>
  );
};

// Feature card component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
      whileHover={{y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"}}
      transition={{duration: 0.2}}
    >
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
};

export default function Page() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
          <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] bg-repeat"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Empowering Students with Access to Academic Resources
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              UniArchive is dedicated to bridging the educational resource gap
              across African universities, ensuring that every student has equal
              access to quality learning materials.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              className="bg-white rounded-xl shadow-md p-8 relative overflow-hidden"
              initial={{opacity: 0, x: -20}}
              whileInView={{opacity: 1, x: 0}}
              transition={{duration: 0.5}}
              viewport={{once: true}}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Our Mission
              </h2>
              <p className="text-gray-600 text-lg">
                To bridge the educational resource gap across African
                universities by providing easy access to past questions, lecture
                notes, and academic materials, empowering students to excel in
                their studies.
              </p>
            </motion.div>

            <motion.div
              className="bg-white rounded-xl shadow-md p-8 relative overflow-hidden"
              initial={{opacity: 0, x: 20}}
              whileInView={{opacity: 1, x: 0}}
              transition={{duration: 0.5}}
              viewport={{once: true}}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Our Vision
              </h2>
              <p className="text-gray-600 text-lg">
                A world where students across Africa can access past questions
                and academic materials instantly, breaking down barriers to
                education and fostering a community of knowledge sharing.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Story Timeline */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            viewport={{once: true}}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Journey
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From a simple idea to a platform serving thousands of students -
              see how UniArchive has evolved.
            </p>
          </motion.div>

          <div className="py-12 space-y-20">
            <TimelineItem
              year="2020"
              title="The Idea"
              description="Recognizing the challenges students face in accessing past exam questions, our founder conceptualized UniArchive as a solution."
              isLeft={true}
            />

            <TimelineItem
              year="2021"
              title="Platform Launch"
              description="UniArchive was officially launched with resources from 10 universities, focusing on the most sought-after courses."
              isLeft={false}
            />

            <TimelineItem
              year="2022"
              title="Rapid Growth"
              description="The platform expanded to cover 30+ universities and introduced new features based on student feedback."
              isLeft={true}
            />

            <TimelineItem
              year="2023"
              title="Community Building"
              description="We established partnerships with student bodies and academic institutions to enhance our resource library."
              isLeft={false}
            />

            <TimelineItem
              year="2024"
              title="UniArchive Today"
              description="Now serving 50+ universities with a comprehensive database of resources and a thriving community of users."
              isLeft={true}
              isLast={true}
            />
          </div>
        </div>
      </section>

      {/* Why UniArchive? Highlights */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            viewport={{once: true}}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why UniArchive?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We&apos;re more than just a repository - we&apos;re a
              comprehensive academic resource hub designed with students in
              mind.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<LuBookOpen size={36} />}
              title="Easy Downloads"
              description="Quick and hassle-free access to all resources with simple download options."
            />

            <FeatureCard
              icon={<LuCalendarClock size={36} />}
              title="Regular Updates"
              description="Our library is constantly updated with the latest past questions and materials."
            />

            <FeatureCard
              icon={<LuFilter size={36} />}
              title="University-specific Filters"
              description="Find exactly what you need with our advanced filtering system."
            />

            <FeatureCard
              icon={<LuCircleCheck size={36} />}
              title="Verified Content"
              description="All materials are verified for accuracy and relevance before being published."
            />
          </div>
        </div>
      </section>

      {/* Impact / Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            viewport={{once: true}}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Impact
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Numbers that reflect our commitment to educational accessibility.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-xl shadow-md p-6">
            <AnimatedCounter
              value={50}
              text="Universities"
              icon={<LuBookOpen size={40} />}
            />

            <AnimatedCounter
              value={1000}
              text="Past Questions"
              icon={<LuCalendarClock size={40} />}
            />

            <AnimatedCounter
              value={10000}
              text="Active Users"
              icon={<LuCircleCheck size={40} />}
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden"
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            viewport={{once: true}}
          >
            <div className="px-6 py-12 md:p-12 text-center md:text-left md:flex md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Ready to find your course materials?
                </h2>
                <p className="text-blue-100 text-lg">
                  Join thousands of students today.
                </p>
              </div>
              <div className="mt-8 md:mt-0 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center md:justify-start">
                <Link
                  href="/register"
                  className="flex items-center w-[170px] xl:w-[240px] h-[70px]  justify-center px-4 py-2 border border-transparent text-[14px] xl:text-[16px] font-semibold rounded-md text-blue-700 bg-white hover:bg-blue-300 hover:text-white hover:border-white hover:border-[2px] hover:shadow-lg  transition-all duration-350"
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/resources"
                  className="flex items-center justify-center w-[170px] xl:w-[240px] h-[70px] px-4 py-2  border-white text-[14px] xl:text-[16px] font-semibold rounded-md text-white hover:bg-blue-200 hover:text-blue-700 hover:border-blue-500 border-[2px] hover:shadow-lg transition-all duration-350"
                >
                  Explore Resources <LuArrowRight className="ml-2" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}