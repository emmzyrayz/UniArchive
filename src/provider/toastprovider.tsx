import { createContext, useContext, useReducer, ReactNode, useCallback } from "react";
import { Toast, ToastContainer } from "@/components/reuse";

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

type ToastAction =
  | { type: "ADD_TOAST"; payload: Toast }
  | { type: "REMOVE_TOAST"; payload: string }
  | { type: "CLEAR_ALL" };

  function toastReducer(state: Toast[], action: ToastAction): Toast[] {
    switch (action.type) {
      case "ADD_TOAST":
        return [...state, action.payload];
      case "REMOVE_TOAST":
        return state.filter((toast) => toast.id !== action.payload);
      case "CLEAR_ALL":
        return [];
      default:
        return state;
    }
  }

  interface ToastProviderProps {
    children: ReactNode;
    maxToasts?: number;
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  }

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

export function ToastProvider({
  children,
  maxToasts = 5,
  position = "bottom-right",
}: ToastProviderProps) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">): string => {
      const id = generateId();
      const newToast = { ...toast, id };

      // Enforce max toasts limit
      if (toasts.length >= maxToasts) {
        dispatch({
          type: "REMOVE_TOAST",
          payload: toasts[0].id,
        });
      }

      dispatch({ type: "ADD_TOAST", payload: newToast });
      return id;
    },
    [toasts, maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", payload: id });
  }, []);

  const contextValue = { toasts, addToast, removeToast };


  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
        position={position}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast } = context;

  return {
    success: useCallback(
      (
        title: string,
        message?: string,
        options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
      ) => addToast({ type: "success", title, message, ...options }),
      [addToast]
    ),
    error: useCallback(
      (
        title: string,
        message?: string,
        options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
      ) => addToast({ type: "error", title, message, ...options }),
      [addToast]
    ),
    warning: useCallback(
      (
        title: string,
        message?: string,
        options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
      ) => addToast({ type: "warning", title, message, ...options }),
      [addToast]
    ),
    info: useCallback(
      (
        title: string,
        message?: string,
        options?: Partial<Omit<Toast, "id" | "type" | "title" | "message">>
      ) => addToast({ type: "info", title, message, ...options }),
      [addToast]
    ),
  };
}


// Usage Examples:

// // ============================================
// // Setup: Root Layout or App Component
// // ============================================

// import { ToastProvider } from "@/components/reuse";

// export default function RootLayout({ children }) {
//   return (
//     <html>
//       <body>
//         <ToastProvider maxToasts={5} position="bottom-right">
//           {children}
//         </ToastProvider>
//       </body>
//     </html>
//   );
// }

// // ============================================
// // Basic Usage Examples
// // ============================================

// "use client"; // Next.js client component

// import { useToast } from "@/components/reuse";

// export function CourseEnrollment() {
//   const toast = useToast();

//   const handleEnroll = async () => {
//     try {
//       const response = await enrollCourse(courseId);
      
//       // Simple success notification
//       toast.success("Enrolled Successfully!", "You are now enrolled in this course.");
//     } catch (error) {
//       // Error notification
//       toast.error("Enrollment Failed", "Please try again later.");
//     }
//   };

//   return <button onClick={handleEnroll}>Enroll Now</button>;
// }

// // ============================================
// // Advanced: With Custom Duration
// // ============================================

// export function FormSubmission() {
//   const toast = useToast();

//   const handleSubmit = async (formData) => {
//     try {
//       await submitForm(formData);
      
//       // Success with longer duration for important messages
//       toast.success(
//         "Profile Updated",
//         "Your changes have been saved.",
//         { duration: 4000 } // 4 seconds
//       );
//     } catch (error) {
//       // Error that persists until user closes it
//       toast.error(
//         "Validation Error",
//         error.message,
//         { duration: 0 } // Persistent until closed
//       );
//     }
//   };

//   return <form onSubmit={handleSubmit}>...</form>;
// }

// // ============================================
// // With Action Buttons
// // ============================================

// export function StudentAssignment() {
//   const toast = useToast();

//   const handleSubmitAssignment = async () => {
//     try {
//       const result = await submitAssignment();
      
//       toast.success(
//         "Assignment Submitted!",
//         "Your work has been recorded.",
//         {
//           duration: 5000,
//           action: {
//             label: "View Submission",
//             onClick: () => {
//               // Navigate to submission page
//               window.location.href = `/assignments/${result.id}`;
//             },
//           },
//         }
//       );
//     } catch (error) {
//       toast.error(
//         "Submission Failed",
//         "Could not submit your assignment. Please check your internet connection.",
//         {
//           duration: 0,
//           action: {
//             label: "Retry",
//             onClick: () => handleSubmitAssignment(),
//           },
//         }
//       );
//     }
//   };

//   return <button onClick={handleSubmitAssignment}>Submit Assignment</button>;
// }

// // ============================================
// // Multiple Notifications in Sequence
// // ============================================

// export function CourseCreation() {
//   const toast = useToast();

//   const handleCreateCourse = async (courseData) => {
//     try {
//       // Show loading indication
//       toast.info("Creating course...", "Please wait while we set up your course.");

//       const course = await createCourse(courseData);

//       // Success notification
//       toast.success(
//         "Course Created!",
//         `"${course.title}" is now live.`,
//         { duration: 4000 }
//       );

//       // Optional: Show next action
//       setTimeout(() => {
//         toast.info(
//           "Next Step",
//           "Add lessons to your course to get started.",
//           { duration: 3000 }
//         );
//       }, 2000);
//     } catch (error) {
//       toast.error(
//         "Creation Failed",
//         error.message,
//         { duration: 0 }
//       );
//     }
//   };

//   return <button onClick={handleCreateCourse}>Create New Course</button>;
// }

// // ============================================
// // Validation Error Notifications
// // ============================================

// export function RegistrationForm() {
//   const toast = useToast();
//   const [errors, setErrors] = useState({});

//   const validateForm = (data) => {
//     const newErrors = {};

//     if (!data.email) newErrors.email = "Email is required";
//     if (!data.password) newErrors.password = "Password is required";
//     if (data.password?.length < 8) {
//       newErrors.password = "Password must be at least 8 characters";
//     }

//     return newErrors;
//   };

//   const handleRegister = async (formData) => {
//     const newErrors = validateForm(formData);

//     if (Object.keys(newErrors).length > 0) {
//       setErrors(newErrors);
      
//       // Show validation error toast
//       toast.warning(
//         "Please Fix These Errors",
//         `${Object.keys(newErrors).length} field(s) need attention.`,
//         { duration: 5000 }
//       );
//       return;
//     }

//     try {
//       await registerUser(formData);
      
//       toast.success(
//         "Registration Complete!",
//         "Welcome to the platform. Redirecting you to your dashboard...",
//         { duration: 3000 }
//       );

//       // Redirect after toast appears
//       setTimeout(() => {
//         window.location.href = "/dashboard";
//       }, 1000);
//     } catch (error) {
//       toast.error("Registration Failed", error.message);
//     }
//   };

//   return <form onSubmit={handleRegister}>...</form>;
// }

// // ============================================
// // File Upload Notifications
// // ============================================

// export function CourseVideoUpload() {
//   const toast = useToast();
//   const [uploadProgress, setUploadProgress] = useState(0);

//   const handleUpload = async (file) => {
//     try {
//       // Initial notification
//       const uploadToastId = toast.info(
//         "Uploading video...",
//         "Please don't close this window.",
//         { duration: 0 } // Persistent
//       );

//       // Simulate upload progress
//       const formData = new FormData();
//       formData.append("file", file);

//       const response = await uploadFile(formData, (progress) => {
//         setUploadProgress(progress);
//       });

//       // Success notification replaces the info one
//       toast.success(
//         "Upload Complete!",
//         "Your video is being processed and will be available shortly.",
//         {
//           duration: 4000,
//           action: {
//             label: "View Video",
//             onClick: () => navigate(`/videos/${response.id}`),
//           },
//         }
//       );
//     } catch (error) {
//       toast.error(
//         "Upload Failed",
//         error.message || "Please try again with a different file.",
//         { duration: 0 }
//       );
//     }
//   };

//   return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
// }

// // ============================================
// // Batch Operations
// // ============================================

// export function StudentGradingBatch() {
//   const toast = useToast();

//   const handleGradeAll = async (submissions) => {
//     try {
//       const successful = [];
//       const failed = [];

//       for (const submission of submissions) {
//         try {
//           await gradeSubmission(submission);
//           successful.push(submission.id);
//         } catch (error) {
//           failed.push(submission.id);
//         }
//       }

//       if (failed.length === 0) {
//         // All succeeded
//         toast.success(
//           "Grading Complete!",
//           `All ${successful.length} assignments have been graded.`,
//           { duration: 4000 }
//         );
//       } else if (successful.length === 0) {
//         // All failed
//         toast.error(
//           "Grading Failed",
//           `Could not grade ${failed.length} assignments.`,
//           { duration: 0 }
//         );
//       } else {
//         // Partial success
//         toast.warning(
//           "Partial Success",
//           `${successful.length} graded, ${failed.length} failed.`,
//           {
//             duration: 0,
//             action: {
//               label: "Retry Failed",
//               onClick: () => {
//                 // Retry only failed items
//               },
//             },
//           }
//         );
//       }
//     } catch (error) {
//       toast.error("Batch Operation Failed", error.message);
//     }
//   };

//   return <button onClick={handleGradeAll}>Grade All</button>;
// }

// // ============================================
// // Contextual Notifications During User Actions
// // ============================================

// export function StudentProgress() {
//   const toast = useToast();

//   const handleCompleteLesson = async (lessonId) => {
//     try {
//       const result = await markLessonComplete(lessonId);

//       // Check if milestone reached
//       if (result.milestone) {
//         toast.success(
//           "🎉 Milestone Reached!",
//           `You've completed ${result.milestone.lessonsCompleted} lessons!`,
//           {
//             duration: 5000,
//             action: {
//               label: "View Achievement",
//               onClick: () => navigate("/achievements"),
//             },
//           }
//         );
//       } else {
//         // Regular completion
//         toast.success(
//           "Lesson Complete",
//           "Great job! Move on to the next lesson.",
//           { duration: 3000 }
//         );
//       }

//       // Show encouragement after a delay
//       if (result.nextMilestone) {
//         setTimeout(() => {
//           const remaining = result.nextMilestone.lessonsCompleted - result.milestone?.lessonsCompleted || 0;
//           toast.info(
//             "Keep Going!",
//             `${remaining} more lessons to your next milestone.`,
//             { duration: 4000 }
//           );
//         }, 2000);
//       }
//     } catch (error) {
//       toast.error("Could not mark lesson as complete", error.message);
//     }
//   };

//   return <button onClick={handleCompleteLesson}>Mark Complete</button>;
// }

// // ============================================
// // Using with React Query / Async Operations
// // ============================================

// import { useMutation } from "@tanstack/react-query";

// export function EnrollmentWithReactQuery() {
//   const toast = useToast();

//   const mutation = useMutation({
//     mutationFn: (courseId) => enrollCourse(courseId),
//     onSuccess: (data) => {
//       toast.success(
//         "Enrolled!",
//         `You're now enrolled in "${data.courseName}".`
//       );
//     },
//     onError: (error) => {
//       toast.error(
//         "Enrollment Error",
//         error.message || "Failed to enroll in course."
//       );
//     },
//     onMutate: () => {
//       // Optional: Show loading state
//       toast.info("Enrolling...", "Processing your enrollment.");
//     },
//   });

//   return (
//     <button onClick={() => mutation.mutate(courseId)} disabled={mutation.isPending}>
//       {mutation.isPending ? "Enrolling..." : "Enroll Now"}
//     </button>
//   );
// }

// // ============================================
// // System-Level Notifications
// // ============================================

// export function AppNotificationHandler() {
//   const toast = useToast();

//   // Listen for system events
//   useEffect(() => {
//     const handleOffline = () => {
//       toast.warning(
//         "You're Offline",
//         "Changes will sync when your connection returns.",
//         { duration: 0 }
//       );
//     };

//     const handleOnline = () => {
//       toast.success(
//         "Back Online",
//         "Your changes are being synced.",
//         { duration: 3000 }
//       );
//     };

//     window.addEventListener("offline", handleOffline);
//     window.addEventListener("online", handleOnline);

//     return () => {
//       window.removeEventListener("offline", handleOffline);
//       window.removeEventListener("online", handleOnline);
//     };
//   }, [toast]);

//   return null;
// }

// // ============================================
// // Provider Configuration Example
// // ============================================

// // For different app sections, you can have different toast positions:

// export function AdminDashboard() {
//   return (
//     <ToastProvider position="top-right" maxToasts={3}>
//       <div>{/* Admin content */}</div>
//     </ToastProvider>
//   );
// }

// export function StudentLearning() {
//   return (
//     <ToastProvider position="bottom-right" maxToasts={5}>
//       <div>{/* Learning content */}</div>
//     </ToastProvider>
//   );
// }