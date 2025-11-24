"use client";
import {motion} from "framer-motion";
import CountUp from "react-countup";
import {LuGraduationCap, LuBookOpen, LuCloudDownload, LuUsers} from "react-icons/lu";

const stats = [
  {
    label: "Total Universities",
    value: 45,
    icon: <LuGraduationCap className="text-indigo-600 w-6 h-6" />,
  },
  {
    label: "Total Courses",
    value: 1020,
    icon: <LuBookOpen className="text-green-600 w-6 h-6" />,
  },
  {
    label: "Total Downloads",
    value: 12000,
    icon: <LuCloudDownload className="text-blue-600 w-6 h-6" />,
  },
  {
    label: "Active Learners",
    value: 430,
    icon: <LuUsers className="text-orange-500 w-6 h-6" />,
  },
];

export const StatsSection = () => {
  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-2 gap-6 text-center">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.5, delay: index * 0.2}}
            className="bg-white rounded-xl p-6 shadow"
          >
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <h3 className="text-2xl font-bold">
              <CountUp end={stat.value} duration={2} separator="," />
            </h3>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
