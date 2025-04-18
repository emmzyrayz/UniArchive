import { MediaRenderer } from "@/utils/mediarender"
import { IoAlertCircle } from "react-icons/io5";

import Join1 from '@/assets/img/gallery/about2.png';


export const Join = () => {

    return (
      <div className="flex flex-col w-full h-full p-[3%] gap-4 items-start justify-center">
        <div className="top relative w-full h-full pb-[56.25%] md:pb-[75%] lg:pb-[56.25%] rounded-lg overflow-hidden">
          <MediaRenderer
            sources={[
              {
                type: "image",
                url: Join1,
                alt: `join avatar`,
                priority: true,
              },
            ]}
            fallbackIcon={IoAlertCircle}
            returnNull={false}
            className="w-full h-full"
            containerStyle={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </div>
        <div className="bottom flex flex-col w-full h-full gap-6">
          <h2 className="text-3xl lg:text-4xl font-semibold">
            Take the next step toward your personal and professional goals with
            us.
          </h2>
          <span className="text-base font-normal text-black/60">
            The automated process all your website tasks. Discover tools and
            techniques to engage effectively with vulnerable children and young
            people.
          </span>
        </div>
        <div className="btn flex items-center justify-center p-4 border-2 rounded-lg bg-black/40 outline-none border-black/60 hover:bg-black hover:text-white cursor-pointer text-[18px] lg:text-lg font-semibold transition-all duration-700">
          <span>Join Now For Free</span>
        </div>
      </div>
    );
}