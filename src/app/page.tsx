"use client"

export default function Page() {

  return (
    <div className="flex flex-col w-full h-full p-2 gap-2 items-center justify-center">
      <div className="welcome flex flex-col w-full min-h-[500px] h-[50%] bg-red-400 my-3 items-center justify-center gap-2 p-2 ">
        <span className="font-poppins font-bold text-4xl">Organize Your Materials</span>
        <p className="font-sora font-lg text-[18px] w-full items-center text-center">
          CourseVault is your secure PDF organizer for courses. Create courses,
          organize files into folders, and easily access all your study
          materials in one place.
        </p>
      </div>
    </div>
  );
}