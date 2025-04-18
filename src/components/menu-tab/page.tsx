'use client'
import {useState} from "react";

import Link from "next/link";
import Image from "next/image";
import {MBanner} from "@/components/banner/page";

// Images
import User from '@/assets/img/people/avatar/author.png'

// Icons
import { CiMobile1 } from "react-icons/ci";
import {
  FaMobile,
  FaWifi,
  FaCreditCard,
  FaRegCreditCard,
  FaUserGraduate,
  FaGraduationCap,
  FaComputer,
  FaRegIdCard,
} from "react-icons/fa6";
import {FaUserTie, FaBookReader, FaIdCard, FaDev} from "react-icons/fa";
import { BsFillPrinterFill, BsPrinter } from "react-icons/bs";
import { IoTv, IoTvOutline } from "react-icons/io5";
import { MdElectricBolt, MdGroup, MdGroups } from "react-icons/md";
import { IoIosFootball } from "react-icons/io";
import {PiUsersThree, PiUsersThreeFill} from "react-icons/pi";


// interface for individual service items
interface ServiceItemData {
  id: string;
  regIcon: React.ReactNode;
  solIcon: React.ReactNode;
  text: string;
  url: string;
}

interface ShortMenuProps {
  item?: ServiceItemData;
}



export const ShortMenu: React.FC<ShortMenuProps> = () => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const serviceItems: ServiceItemData[] = [
    {
      id: "airtime",
      regIcon: <CiMobile1 size={28} />,
      solIcon: <FaMobile size={28} />,
      text: "Airtime",
      url: "#",
    },
    {
      id: "data",
      regIcon: <FaWifi size={28} />,
      solIcon: <FaWifi size={28} />,
      text: "Data",
      url: "#",
    },
    {
      id: "print",
      regIcon: <BsPrinter size={28} />,
      solIcon: <BsFillPrinterFill size={28} />,
      text: "Print Card",
      url: "#",
    },
    {
      id: "cable",
      regIcon: <IoTvOutline size={28} />,
      solIcon: <IoTv size={28} />,
      text: "Cable TV",
      url: "#",
    },
    {
      id: "electricity",
      regIcon: <MdElectricBolt size={28} />,
      solIcon: <MdElectricBolt size={28} />,
      text: "Electricity",
      url: "#",
    },
    {
      id: "virtual",
      regIcon: <FaRegCreditCard size={28} />,
      solIcon: <FaCreditCard size={28} />,
      text: "Virtual Card",
      url: "#",
    },
    {
      id: "bet",
      regIcon: <IoIosFootball size={28} />,
      solIcon: <IoIosFootball size={28} />,
      text: "Bet Funding",
      url: "#",
    },
    {
      id: "refer",
      regIcon: <MdGroup size={28} />,
      solIcon: <MdGroup size={28} />,
      text: "Refer2Earn",
      url: "#",
    },
    {
      id: "pin",
      regIcon: <FaUserGraduate size={28} />,
      solIcon: <FaUserGraduate size={28} />,
      text: "Exam Pin",
      url: "#",
    },
    {
      id: "cybercafe",
      regIcon: <FaUserTie size={28} />,
      solIcon: <FaUserTie size={28} />,
      text: "Cybercafe",
      url: "#",
    },
    {
      id: "admission",
      regIcon: <FaGraduationCap size={28} />,
      solIcon: <FaGraduationCap size={28} />,
      text: "Admission",
      url: "#",
    },
    {
      id: "cbt",
      regIcon: <FaComputer size={28} />,
      solIcon: <FaComputer size={28} />,
      text: "CBT",
      url: "#",
    },
    {
      id: "study",
      regIcon: <FaBookReader size={28} />,
      solIcon: <FaBookReader size={28} />,
      text: "Study",
      url: "#",
    },
    {
      id: "meet",
      regIcon: <PiUsersThree size={28} />,
      solIcon: <PiUsersThreeFill size={28} />,
      text: "Pan Meet",
      url: "#",
    },
    {
      id: "kyc",
      regIcon: <FaRegIdCard size={28} />,
      solIcon: <FaIdCard size={28} />,
      text: "KYC",
      url: "#",
    },
    {
      id: "api",
      regIcon: <FaDev size={28} />,
      solIcon: <FaDev size={28} />,
      text: "API",
      url: "#",
    },
  ];

    return (
      <div className="flex flex-col w-full h-full gap-2 p-2 overflow-hidden">
        <div className="top flex flex-row w-full items-center justify-between bg-black p-2 -mt-3 rounded-xl">
          <div className="user flex flex-row items-center justify-center gap-2">
            <div className="user-img flex w-[50px] h-[50px] rounded-full">
              <Image
                src={User}
                alt="User img"
                width={100}
                height={100}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="user-info  font-medium text-white">
              <p className="name text-[18px] font-semibold">Mr John Doe</p>
              <div className="user-text text-[12px] font-[400]">
                <p>Lorem ipsum dolor sit amet, consectetur adipisicing.</p>
              </div>
            </div>
          </div>

          <div className="finance-tab flex flex-col items-start justify-center p-2 text-[14px] text-white text-bold">
            <div className="balance flex flex-col">
              <div className="wallet flex flex-row gap-1 ">
                <span>Wallet balance:</span>
                <p className="currency">$</p>
                <span>50,000.00</span>
              </div>
              <div className="earnings flex flex-row gap-1">
                <span>Points:</span>
                <span>300</span>
              </div>
            </div>

            <div className="package flex flex-row gap-1">
              <span>Package:</span>
              <span>Free</span>
            </div>
          </div>
        </div>

        <section className="w-full rounded-xl">
          <MBanner />
        </section>

        <div className="alert-con flex h-[100px] w-full bg-black/20 rounded-lg p-3 border-solid border-[2px] border-black/70 shadow-black/60 shadow-md items-center justify-center my-3">
          <div className="message">
            <p>service alert message goes here</p>
          </div>
        </div>

        <div className="service-con flex flex-col items-center justify-center w-full bg-black/20 p-3 rounded-lg">
          <div className="service-top flex flex-row w-full items-center justify-between">
            <h2 className="title text-[24px] font-bold">Service Menu</h2>

            <div className="more text-xl font-semibold cursor-pointer hover:underline">see more</div>
          </div>
          <div className="service-items p-2 bg-white/20 rounded-lg w-full h-full items-center justify-center flex flex-row flex-wrap gap-4">
            {/* Service items */}
            {serviceItems.map((item) => (
              <Link
                href={item.url}
                key={item.id}
                className="flex w-[120px] h-[120px] items-center justify-center rounded-xl p-4 hover:bg-black hover:text-white duration-500 trasition-all ease-in-out"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="service-item flex flex-col w-full h-full items-center justify-center gap-2 relative">
                  <div className="icon flex w-full items-center justify-center">
                    {hoveredItem === item.id ? item.solIcon : item.regIcon}
                  </div>
                  <span className="name flex w-full items-center justify-center text-semibold text-[18px] text-center">
                    {item.text}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
}