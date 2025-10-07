import React from "react";

export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {

    return (
      <div className="flex flex-col w-full h-[100vh] items-center justify-center bg-white/60 overflow-hidden">
        <span>haelll</span>
        <div className="section flex flex-row w-[70%] h-[60%] p-4 items-center justify-center rounded-xl shadow-xl hover:shadow-2xl backdrop-blur-xl -bg-linear-30 bg-black/20 border-[2px] border-solid border-gray-500/20 outline-gray-400/20 outline-[2px]">
          <div className="left">
            <span>left</span>
          </div>
          <div className="right">
            {children}
          </div>
        </div>
      </div>
    );
  }