"use client";
import {motion} from "framer-motion";
import {FaUpload, FaUniversity} from "react-icons/fa";

interface Activity {
  type: "upload" | "new-dept";
  message: string;
  time: string;
}

const activities: Activity[] = [
  {
    type: "upload",
    message: "Math 101 Past Question uploaded",
    time: "2 mins ago",
  },
  {
    type: "new-dept",
    message: "Unizik added a new department",
    time: "1 hr ago",
  },
  {
    type: "upload",
    message: "ENG 202 Notes uploaded by @Ada_notes",
    time: "3 hrs ago",
  },
];

export const ActivityFeed = () => (
  <section className="py-16 px-4 bg-gray-50">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Latest Activity
      </h2>
      <ul className="space-y-4">
        {activities.map((activity, i) => (
          <motion.li
            key={i}
            className="bg-white p-4 rounded-xl shadow hover:shadow-md flex items-start gap-3"
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            transition={{delay: i * 0.1}}
          >
            <div className="text-blue-600 mt-1">
              {activity.type === "upload" ? (
                <FaUpload size={20} />
              ) : (
                <FaUniversity size={20} />
              )}
            </div>
            <div>
              <p className="text-gray-800">{activity.message}</p>
              <span className="text-sm text-gray-400">{activity.time}</span>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  </section>
);