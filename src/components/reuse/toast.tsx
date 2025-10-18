import { useEffect, useCallback, useMemo } from "react";
import { Alert } from "@/components/UI";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: ToastItemProps) {
  const handleClose = useCallback(() => {
    onClose(toast.id);
  }, [toast.id, onClose]);

  const effectiveDuration = useMemo(
    () => toast.duration ?? 5000,
    [toast.duration]
  );

  const shouldAutoClose = useMemo(
    () => effectiveDuration !== 0,
    [effectiveDuration]
  );

  useEffect(() => {
    if (!shouldAutoClose) return;

    const timer = setTimeout(() => {
      handleClose();
    }, effectiveDuration);

    return () => clearTimeout(timer);
  }, [effectiveDuration, shouldAutoClose, handleClose]);

  return (
    <div
      className="animate-in slide-in-from-right-full duration-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Alert
        type={toast.type}
        title={toast.title}
        message={toast.message}
        closable
        onClose={handleClose}
        className="min-w-80 shadow-lg"
      />
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function ToastContainer({
  toasts,
  onClose,
  position = "bottom-right",
}: ToastContainerProps) {
  const positionClasses = useMemo(() => {
    const positions = {
      "top-left": "top-4 left-4",
      "top-right": "top-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "bottom-right": "bottom-4 right-4",
    };
    return `fixed z-50 flex flex-col gap-3 pointer-events-none ${positions[position]}`;
  }, [position]);

  return toasts.length === 0 ? null : (
    <div className={positionClasses} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

// Toast Manager Hook
export function useToast() {
  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    return { ...toast, id };
  }, []);

  const successToast = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: "success", title, message });
    },
    [addToast]
  );

  const errorToast = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: "error", title, message });
    },
    [addToast]
  );

  const warningToast = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: "warning", title, message });
    },
    [addToast]
  );

  const infoToast = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: "info", title, message });
    },
    [addToast]
  );

  return {
    addToast,
    successToast,
    errorToast,
    warningToast,
    infoToast,
  };
}

// Usage Examples:

// "use client";

// import { useState, useCallback } from "react";
// import { Toast, ToastItem, ToastContainer, useToast } from "@/components/Toast";
// import { Button, Card } from "@/components/UI";

// // Example 1: Basic Toast Usage
// export function BasicToastExample() {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const { successToast, errorToast, warningToast, infoToast } = useToast();

//   const handleAddSuccess = useCallback(() => {
//     const toast = successToast(
//       "Course Enrolled",
//       "You're now enrolled in React Fundamentals"
//     );
//     setToasts((prev) => [...prev, toast]);
//   }, [successToast]);

//   const handleAddError = useCallback(() => {
//     const toast = errorToast(
//       "Enrollment Failed",
//       "Please check your payment method"
//     );
//     setToasts((prev) => [...prev, toast]);
//   }, [errorToast]);

//   const handleAddWarning = useCallback(() => {
//     const toast = warningToast(
//       "Storage Low",
//       "You have less than 100MB available"
//     );
//     setToasts((prev) => [...prev, toast]);
//   }, [warningToast]);

//   const handleAddInfo = useCallback(() => {
//     const toast = infoToast(
//       "New Update Available",
//       "Refresh to get the latest features"
//     );
//     setToasts((prev) => [...prev, toast]);
//   }, [infoToast]);

//   const handleClose = useCallback((id: string) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   return (
//     <div className="p-6 space-y-4">
//       <h2 className="text-2xl font-bold text-black mb-6">
//         Toast Notifications
//       </h2>

//       <div className="space-y-2">
//         <Button
//           variant="primary"
//           label="Success Toast"
//           onClick={handleAddSuccess}
//         />
//         <Button
//           variant="primary"
//           label="Error Toast"
//           onClick={handleAddError}
//         />
//         <Button
//           variant="primary"
//           label="Warning Toast"
//           onClick={handleAddWarning}
//         />
//         <Button variant="primary" label="Info Toast" onClick={handleAddInfo} />
//       </div>

//       <ToastContainer
//         toasts={toasts}
//         onClose={handleClose}
//         position="bottom-right"
//       />
//     </div>
//   );
// }

// // Example 2: Course Enrollment Flow
// export function CourseEnrollmentToastExample() {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const { successToast, errorToast } = useToast();

//   const handleEnrollCourse = useCallback(
//     async (courseName: string) => {
//       try {
//         // Simulate enrollment process
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         const toast = successToast(
//           "Welcome!",
//           `You've successfully enrolled in ${courseName}`
//         );
//         setToasts((prev) => [...prev, toast]);
//       } catch (error) {
//         const toast = errorToast("Enrollment Failed", "Please try again later");
//         setToasts((prev) => [...prev, toast]);
//       }
//     },
//     [successToast, errorToast]
//   );

//   const handleClose = useCallback((id: string) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black mb-6">Enroll in Courses</h2>

//       <div className="space-y-3">
//         {["React Fundamentals", "TypeScript Mastery", "Node.js Backend"].map(
//           (course) => (
//             <Card
//               key={course}
//               variant="outlined"
//               className="p-4 flex justify-between items-center"
//             >
//               <p className="font-medium text-black">{course}</p>
//               <Button
//                 variant="primary"
//                 label="Enroll"
//                 onClick={() => handleEnrollCourse(course)}
//               />
//             </Card>
//           )
//         )}
//       </div>

//       <ToastContainer toasts={toasts} onClose={handleClose} />
//     </div>
//   );
// }

// // Example 3: Toast Positions
// export function ToastPositionsExample() {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const [position, setPosition] = useState<
//     "top-left" | "top-right" | "bottom-left" | "bottom-right"
//   >("bottom-right");
//   const { infoToast } = useToast();

//   const positions: Array<
//     "top-left" | "top-right" | "bottom-left" | "bottom-right"
//   > = ["top-left", "top-right", "bottom-left", "bottom-right"];

//   const handleAddToast = useCallback(() => {
//     const toast = infoToast(
//       "Position Changed",
//       `Toast now appears at ${position}`
//     );
//     setToasts((prev) => [...prev, toast]);
//   }, [position, infoToast]);

//   const handleClose = useCallback((id: string) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   return (
//     <div className="p-6 space-y-6">
//       <h2 className="text-2xl font-bold text-black mb-6">Toast Positions</h2>

//       <div className="space-y-2">
//         {positions.map((pos) => (
//           <Button
//             key={pos}
//             variant={position === pos ? "primary" : "outline"}
//             label={`Position: ${pos}`}
//             onClick={() => setPosition(pos)}
//           />
//         ))}
//       </div>

//       <Button variant="primary" label="Show Toast" onClick={handleAddToast} />

//       <ToastContainer
//         toasts={toasts}
//         onClose={handleClose}
//         position={position}
//       />
//     </div>
//   );
// }

// // Example 4: Auto-dismissing Toasts
// export function AutoDismissToastExample() {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const { addToast } = useToast();

//   const handleAddPersistent = useCallback(() => {
//     const toast = addToast({
//       type: "warning",
//       title: "Important Notice",
//       message: "This notification won't auto-dismiss",
//       duration: 0, // 0 means don't auto-dismiss
//     });
//     setToasts((prev) => [...prev, toast]);
//   }, [addToast]);

//   const handleAddAutoClose = useCallback(() => {
//     const toast = addToast({
//       type: "info",
//       title: "Quick Message",
//       message: "This will auto-dismiss in 3 seconds",
//       duration: 3000,
//     });
//     setToasts((prev) => [...prev, toast]);
//   }, [addToast]);

//   const handleClose = useCallback((id: string) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   return (
//     <div className="p-6 space-y-4">
//       <h2 className="text-2xl font-bold text-black mb-6">Toast Durations</h2>

//       <div className="space-y-2">
//         <Button
//           variant="primary"
//           label="Persistent Toast (no auto-close)"
//           onClick={handleAddPersistent}
//         />
//         <Button
//           variant="primary"
//           label="Quick Toast (3 seconds)"
//           onClick={handleAddAutoClose}
//         />
//       </div>

//       <ToastContainer toasts={toasts} onClose={handleClose} />
//     </div>
//   );
// }

// // Example 5: Complete Toast System
// export default function ToastSystemDashboard() {
//   const [toasts, setToasts] = useState<Toast[]>([]);
//   const [position, setPosition] = useState<
//     "top-left" | "top-right" | "bottom-left" | "bottom-right"
//   >("bottom-right");
//   const { successToast, errorToast, warningToast, infoToast, addToast } =
//     useToast();

//   const handleAction = useCallback(() => {
//     console.log("Toast action triggered!");
//   }, []);

//   const handleAddCustom = useCallback(() => {
//     const toast = addToast({
//       type: "info",
//       title: "Course Update",
//       message: "New content has been added to React Advanced",
//       duration: 0,
//       action: {
//         label: "View Now",
//         onClick: handleAction,
//       },
//     });
//     setToasts((prev) => [...prev, toast]);
//   }, [addToast, handleAction]);

//   const handleClose = useCallback((id: string) => {
//     setToasts((prev) => prev.filter((t) => t.id !== id));
//   }, []);

//   const toastExamples = [
//     {
//       label: "Success",
//       action: () => {
//         const toast = successToast(
//           "Course Completed",
//           "Congratulations on completing React Advanced!"
//         );
//         setToasts((prev) => [...prev, toast]);
//       },
//     },
//     {
//       label: "Error",
//       action: () => {
//         const toast = errorToast(
//           "Payment Failed",
//           "Your card was declined. Please try another payment method."
//         );
//         setToasts((prev) => [...prev, toast]);
//       },
//     },
//     {
//       label: "Warning",
//       action: () => {
//         const toast = warningToast(
//           "Session Expiring",
//           "Your session will expire in 5 minutes"
//         );
//         setToasts((prev) => [...prev, toast]);
//       },
//     },
//     {
//       label: "Info",
//       action: () => {
//         const toast = infoToast(
//           "New Lesson Available",
//           "Check out the latest lesson on Advanced Patterns"
//         );
//         setToasts((prev) => [...prev, toast]);
//       },
//     },
//   ];

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-4xl mx-auto">
//         {/* Header */}
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-black mb-2">Toast System</h1>
//           <p className="text-gray-600">Notification and feedback system</p>
//         </div>

//         {/* Position Selector */}
//         <Card variant="elevated" className="p-6 mb-12">
//           <h2 className="text-lg font-semibold text-black mb-4">Position</h2>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
//             {["top-left", "top-right", "bottom-left", "bottom-right"].map(
//               (pos: any) => (
//                 <Button
//                   key={pos}
//                   variant={position === pos ? "primary" : "outline"}
//                   label={pos}
//                   onClick={() => setPosition(pos)}
//                 />
//               )
//             )}
//           </div>
//         </Card>

//         {/* Toast Types */}
//         <Card variant="elevated" className="p-6 mb-12">
//           <h2 className="text-lg font-semibold text-black mb-4">Types</h2>
//           <div className="grid md:grid-cols-2 gap-3">
//             {toastExamples.map((example) => (
//               <Button
//                 key={example.label}
//                 variant="primary"
//                 label={`Show ${example.label}`}
//                 onClick={example.action}
//               />
//             ))}
//           </div>
//         </Card>

//         {/* Custom Toast */}
//         <Card variant="elevated" className="p-6">
//           <h2 className="text-lg font-semibold text-black mb-4">Advanced</h2>
//           <Button
//             variant="primary"
//             label="Toast with Action"
//             onClick={handleAddCustom}
//           />
//         </Card>

//         {/* Toast Container */}
//         <ToastContainer
//           toasts={toasts}
//           onClose={handleClose}
//           position={position}
//         />
//       </div>
//     </div>
//   );
// }