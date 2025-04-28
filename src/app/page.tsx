// import {CardOne, CardTwo, CardThree} from "@/components/ui/card";
import React from "react";


import { Banner } from "@/components/banner";
import { TopDepartment } from "@/components/department";
import { TopFaculty } from "@/components/faculty";

export default function Home() {
  return (
    <div className="flex flex-col item-center justify-center w-full h-full relative overflow-hidden">
     <Banner />
     <TopDepartment />
     <TopFaculty />
    </div>
  );
}