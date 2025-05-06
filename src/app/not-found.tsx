"use client";

// import {useEffect} from "react";
import Link from "next/link";
import {NotFoundIllustration} from "@/assets/svgs/notfound";
import {motion} from "framer-motion";

export default function NotFound() {
  return (
    <div className="flex w-screen h-screen items-center justify-center relative bg-[radial-gradient(at_50%_-20%,_#908392,_#0d060e)] p-0">
      <Link
        href="/"
        className="flex flex-col gap-9 items-center justify-center w-full scrollbar-hide min-h-full m-0"
      >
        <motion.div
          className="row flex w-[80%] "
          animate={{
            y: [0, 10, 0],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <NotFoundIllustration />
        </motion.div>

        {/* If you need to target the zero specifically */}
        <motion.div
          id="zero"
          animate={{
            x: [0, 10, 0],
            scale: [1, 1.4, 1],
            rotateY: [0, 180, 0],
          }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <span className=''>
            <p className=''>OOOPS!!!</p>
            <p className=''>Page not found try again next time</p>
          </span>
          {/* This would contain your zero element if separated from the main illustration */}
        </motion.div>
      </Link>
    </div>
  );
}
