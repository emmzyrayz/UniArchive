import { ReactNode, useState, useCallback, useRef, useEffect } from "react";

interface TooltipProps {
  text: string | ReactNode;
  children: ReactNode;
  position?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  delay?: number;
  className?: string;
  tooltipClassName?: string;
  disabled?: boolean;
  maxWidth?: string | number;
  trigger?: "hover" | "click";
  closeOnClickOutside?: boolean;
  arrow?: boolean;
}

export default function Tooltip({
  text,
  children,
  position = "top",
  delay = 300,
  className = "",
  tooltipClassName = "",
  disabled = false,
  maxWidth = "16rem",
  trigger = "hover",
  closeOnClickOutside = true,
  arrow = true,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay, disabled]);

  const hideTip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (trigger === "click") {
      setVisible((prev) => !prev);
    }
  }, [disabled, trigger]);

  // Close on outside click for click-triggered tooltips
  useEffect(() => {
    if (trigger === "click" && closeOnClickOutside && visible) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          tooltipRef.current &&
          !tooltipRef.current.contains(event.target as Node)
        ) {
          hideTip();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [trigger, closeOnClickOutside, visible, hideTip]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
    "top-left": "bottom-full mb-2 left-0",
    "top-right": "bottom-full mb-2 right-0",
    "bottom-left": "top-full mt-2 left-0",
    "bottom-right": "top-full mt-2 right-0",
  }[position];

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-black border-x-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-black border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-black border-y-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-black border-y-transparent border-l-transparent",
    "top-left":
      "top-full left-3 border-t-black border-x-transparent border-b-transparent",
    "top-right":
      "top-full right-3 border-t-black border-x-transparent border-b-transparent",
    "bottom-left":
      "bottom-full left-3 border-b-black border-x-transparent border-t-transparent",
    "bottom-right":
      "bottom-full right-3 border-b-black border-x-transparent border-t-transparent",
  }[position];

  const eventHandlers =
    trigger === "hover"
      ? {
          onMouseEnter: showTip,
          onMouseLeave: hideTip,
        }
      : {
          onClick: handleClick,
        };

  return (
    <div
      className={`relative inline-block ${className}`}
      {...eventHandlers}
      ref={tooltipRef}
    >
      {children}
      {visible && !disabled && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal break-words ${positionClasses} ${tooltipClassName}`}
          style={{ maxWidth }}
          role="tooltip"
        >
          {text}
          {arrow && (
            <div className={`absolute w-0 h-0 border-4 ${arrowClasses}`} />
          )}
        </div>
      )}
    </div>
  );
}

// Usage Example 
// import Tooltip from "./tooltip";
// import {
//   FiInfo,
//   FiHelpCircle,
//   FiAlertTriangle,
//   FiCheckCircle,
//   FiLock,
//   FiStar,
//   FiClock,
//   FiBook,
//   FiVideo,
//   FiAward,
// } from "react-icons/fi";

// export default function TooltipExamples() {
//   return (
//     <div className="p-6 space-y-8 bg-white">
//       {/* Course Action Buttons with Tooltips */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Course Actions</h2>
//         <div className="flex flex-wrap gap-4 items-center">
//           <Tooltip text="Watch video lesson" position="top">
//             <button className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
//               <FiVideo size={20} />
//             </button>
//           </Tooltip>

//           <Tooltip text="Mark as completed" position="bottom">
//             <button className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
//               <FiCheckCircle size={20} />
//             </button>
//           </Tooltip>

//           <Tooltip text="Save to favorites" position="left">
//             <button className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
//               <FiStar size={20} />
//             </button>
//           </Tooltip>

//           <Tooltip
//             text="Advanced content - requires prerequisites"
//             position="right"
//           >
//             <button className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
//               <FiLock size={20} />
//             </button>
//           </Tooltip>
//         </div>
//       </div>

//       {/* Status Indicators */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Status Information</h2>
//         <div className="flex flex-wrap gap-4 items-center">
//           <Tooltip
//             text="This course includes interactive coding exercises and projects"
//             position="top"
//             arrow={false}
//           >
//             <span className="flex items-center gap-1 text-blue-600 cursor-help">
//               <FiInfo size={16} />
//               Interactive
//             </span>
//           </Tooltip>

//           <Tooltip
//             text={
//               <div className="text-center">
//                 <div className="font-semibold">Certificate Available</div>
//                 <div className="text-xs mt-1">
//                   Complete all assignments to earn your certificate
//                 </div>
//               </div>
//             }
//             position="bottom"
//             maxWidth="12rem"
//           >
//             <span className="flex items-center gap-1 text-green-600 cursor-help">
//               <FiAward size={16} />
//               Certified
//             </span>
//           </Tooltip>

//           <Tooltip
//             text="Estimated time to complete: 8-10 hours"
//             position="top-right"
//           >
//             <span className="flex items-center gap-1 text-gray-600 cursor-help">
//               <FiClock size={16} />8 hours
//             </span>
//           </Tooltip>
//         </div>
//       </div>

//       {/* Progress and Statistics */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Progress Tracking</h2>
//         <div className="flex flex-wrap gap-6 items-center">
//           <Tooltip text="65% completed - 13/20 lessons finished" position="top">
//             <div className="w-32 bg-gray-200 rounded-full h-2">
//               <div
//                 className="bg-green-600 h-2 rounded-full"
//                 style={{ width: "65%" }}
//               ></div>
//             </div>
//           </Tooltip>

//           <Tooltip
//             text={
//               <div>
//                 <div>Current streak: 7 days</div>
//                 <div className="text-xs text-gray-300">
//                   Keep learning to maintain your streak!
//                 </div>
//               </div>
//             }
//             position="bottom"
//           >
//             <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
//               🔥 7 days
//             </div>
//           </Tooltip>
//         </div>
//       </div>

//       {/* Click-Triggered Tooltips */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">
//           Click to Reveal (Help Tips)
//         </h2>
//         <div className="flex flex-wrap gap-4 items-center">
//           <Tooltip
//             text="Use Ctrl+K to quickly search through course content"
//             position="top"
//             trigger="click"
//             closeOnClickOutside={true}
//           >
//             <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
//               <FiHelpCircle size={16} />
//               Keyboard Shortcuts
//             </button>
//           </Tooltip>

//           <Tooltip
//             text={
//               <div className="space-y-2">
//                 <div className="font-semibold">Grading Criteria</div>
//                 <ul className="text-xs list-disc list-inside space-y-1">
//                   <li>Code correctness: 40%</li>
//                   <li>Code quality: 30%</li>
//                   <li>Documentation: 20%</li>
//                   <li>Timeliness: 10%</li>
//                 </ul>
//               </div>
//             }
//             position="bottom"
//             trigger="click"
//             maxWidth="14rem"
//           >
//             <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
//               <FiAlertTriangle size={16} />
//               Grading Info
//             </button>
//           </Tooltip>
//         </div>
//       </div>

//       {/* Complex Content Tooltips */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Rich Content Tooltips</h2>
//         <div className="flex flex-wrap gap-4">
//           <Tooltip
//             text={
//               <div className="space-y-2">
//                 <div className="font-semibold flex items-center gap-2">
//                   <FiBook size={14} />
//                   Prerequisites Required
//                 </div>
//                 <ul className="text-xs space-y-1">
//                   <li>• Basic JavaScript knowledge</li>
//                   <li>• Understanding of React hooks</li>
//                   <li>• HTML & CSS fundamentals</li>
//                 </ul>
//                 <button className="w-full mt-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
//                   View Prep Course
//                 </button>
//               </div>
//             }
//             position="top"
//             maxWidth="15rem"
//           >
//             <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-help">
//               <FiInfo size={14} />
//               Requirements
//             </span>
//           </Tooltip>

//           <Tooltip
//             text={
//               <div className="text-center space-y-2">
//                 <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
//                   <FiStar size={16} className="text-white" />
//                 </div>
//                 <div className="font-semibold">Featured Course</div>
//                 <div className="text-xs text-gray-300">
//                   This course is recommended by 95% of students
//                 </div>
//               </div>
//             }
//             position="bottom"
//             maxWidth="12rem"
//           >
//             <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium cursor-help">
//               Featured
//             </div>
//           </Tooltip>
//         </div>
//       </div>

//       {/* Position Variations */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold text-black">Position Variations</h2>
//         <div className="flex flex-wrap gap-8 justify-center items-center p-8 border border-gray-200 rounded-lg">
//           <Tooltip text="Top tooltip" position="top">
//             <button className="px-4 py-2 bg-gray-800 text-white rounded">
//               Top
//             </button>
//           </Tooltip>

//           <Tooltip text="Right tooltip" position="right">
//             <button className="px-4 py-2 bg-gray-800 text-white rounded">
//               Right
//             </button>
//           </Tooltip>

//           <Tooltip text="Bottom tooltip" position="bottom">
//             <button className="px-4 py-2 bg-gray-800 text-white rounded">
//               Bottom
//             </button>
//           </Tooltip>

//           <Tooltip text="Left tooltip" position="left">
//             <button className="px-4 py-2 bg-gray-800 text-white rounded">
//               Left
//             </button>
//           </Tooltip>

//           <Tooltip text="Top left aligned" position="top-left">
//             <button className="px-4 py-2 bg-gray-800 text-white rounded">
//               Top Left
//             </button>
//           </Tooltip>

//           <Tooltip text="Bottom right aligned" position="bottom-right">
//             <button className="px-4 py-2 bg-gray-800 text-white rounded">
//               Bottom Right
//             </button>
//           </Tooltip>
//         </div>
//       </div>
//     </div>
//   );
// }