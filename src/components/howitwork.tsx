"use client";
import {motion} from "framer-motion";
import {LuGraduationCap, LuBookOpen, LuDownload} from "react-icons/lu";

const steps = [
  {
    title: "Pick Your University",
    description:
      "Browse or search from a growing list of verified universities.",
    icon: <LuGraduationCap className="w-6 h-6 text-white" />,
    color: "bg-blue-600",
  },
  {
    title: "Select Your Course",
    description: "Find your department and explore available courses.",
    icon: <LuBookOpen className="w-6 h-6 text-white" />,
    color: "bg-purple-600",
  },
  {
    title: "Start Learning",
    description:
      "Download materials, access past questions, and study with ease.",
    icon: <LuDownload className="w-6 h-6 text-white" />,
    color: "bg-green-600",
  },
];

export const HowItWorks = () => {
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6"
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}
        >
          How It Works
        </motion.h2>
        <p className="text-gray-600 max-w-xl mx-auto mb-12">
          Follow these simple steps to begin your academic journey with
          UniArchive.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="bg-gray-100 rounded-xl p-6 shadow-md hover:shadow-lg transition group relative"
              initial={{opacity: 0, y: 30}}
              whileInView={{opacity: 1, y: 0}}
              transition={{delay: index * 0.2}}
            >
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-full ${step.color} mb-4 mx-auto group-hover:scale-110 transition`}
              >
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm">{step.description}</p>
              <div className="absolute w-2 h-2 bg-gray-300 rounded-full top-1/2 right-[-1.25rem] hidden sm:block" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
