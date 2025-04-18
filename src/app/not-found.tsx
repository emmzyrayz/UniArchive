'use client';

import {useEffect} from "react";
import Link from "next/link";
import { NotFoundIllustration } from "@/assets/svgs/notfound";
// import "./not-found.css";
import anime from "animejs";

export default function NotFound() {
  useEffect(() => {
    anime({
      targets: ".row svg",
      translateY: 10,
      autoplay: true,
      loop: true,
      easing: "easeInOutSine",
      direction: "alternate",
    });

    anime({
      targets: "#zero",
      translateX: 10,
      autoplay: true,
      loop: true,
      easing: "easeInOutSine",
      direction: "alternate",
      scale: [{value: 1}, {value: 1.4}, {value: 1, delay: 250}],
      rotateY: {value: "+=180", delay: 200},
    });
  }, []);

    return (
      <div className="flex w-screen h-screen items-center justify-center relative bg-[radial-gradient(at_50%_-20%,_#908392,_#0d060e)] p-0">
        <Link
          href="/"
          className="flex flex-row items-center justify-center w-full scrollbar-hide min-h-full m-0"
        >
          <NotFoundIllustration />
        </Link>
      </div>
    );
}