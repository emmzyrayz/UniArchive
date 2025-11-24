"use client";
import {motion} from "framer-motion";

export const NewsletterCTA = () => {
  return (
    <section className="bg-black/40 m-3 rounded-lg text-white py-12 px-4">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <motion.h2
          initial={{opacity: 0, y: -20}}
          whileInView={{opacity: 1, y: 0}}
          transition={{duration: 0.6}}
          className="text-3xl sm:text-4xl font-bold"
        >
          Stay Updated with the Latest Courses & Universities!
        </motion.h2>
        <motion.p
          initial={{opacity: 0, y: -10}}
          whileInView={{opacity: 1, y: 0}}
          transition={{delay: 0.2, duration: 0.6}}
          className="text-white/90"
        >
          Subscribe to receive course updates and new university listings
          directly to your inbox.
        </motion.p>
        <motion.form
          initial={{opacity: 0, y: 10}}
          whileInView={{opacity: 1, y: 0}}
          transition={{delay: 0.4, duration: 0.6}}
          className="flex flex-col sm:flex-row justify-center items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            alert("Subscribed!");
          }}
        >
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full sm:w-80 px-4 py-3 bg-black/20 border-black border  rounded-lg text-white focus:outline-none"
            required
          />
          <button
            type="submit"
            className="bg-white text-black/70 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
          >
            Subscribe
          </button>
        </motion.form>
      </div>
    </section>
  );
};