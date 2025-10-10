import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = "",
}: ModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeOnEsc, isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-full max-h-full m-0 rounded-none",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => closeOnOverlayClick && onClose()}
    >
      <div
        className={`
          bg-white rounded-xl shadow-2xl w-full ${sizeMap[size]} 
          max-h-[90vh] overflow-hidden flex flex-col
          animate-in zoom-in-95 duration-200
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            {title && (
              <h2 className="text-xl font-semibold text-black">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  ml-auto p-1 rounded-lg text-gray-400 
                  hover:text-gray-600 hover:bg-gray-100 
                  transition-colors duration-200
                "
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


// usage example

// import { useState } from "react";
// import { Modal, Button } from "@/components/UI";

// function MyComponent() {
//   const [isOpen, setIsOpen] = useState(false);
//   const [confirmOpen, setConfirmOpen] = useState(false);

//   return (
//     <>
//       <Button label="Open Modal" onClick={() => setIsOpen(true)} />

//       {/* Basic Modal */}
//       <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Welcome!">
//         <p>This is a simple modal with a title.</p>
//       </Modal>

//       {/* Confirmation Modal */}
//       <Modal
//         isOpen={confirmOpen}
//         onClose={() => setConfirmOpen(false)}
//         title="Delete Course?"
//         size="sm"
//         footer={
//           <div className="flex gap-2 justify-end">
//             <Button
//               label="Cancel"
//               variant="outline"
//               onClick={() => setConfirmOpen(false)}
//             />
//             <Button label="Delete" variant="primary" onClick={handleDelete} />
//           </div>
//         }
//       >
//         <p className="text-gray-600">
//           Are you sure you want to delete this course? This action cannot be
//           undone.
//         </p>
//       </Modal>

//       {/* Form Modal */}
//       <Modal
//         isOpen={formOpen}
//         onClose={() => setFormOpen(false)}
//         title="Create New Course"
//         size="lg"
//         closeOnOverlayClick={false} // Prevent accidental close
//         footer={
//           <div className="flex gap-2 justify-end">
//             <Button
//               label="Cancel"
//               variant="outline"
//               onClick={() => setFormOpen(false)}
//             />
//             <Button
//               label="Create Course"
//               loading={isSubmitting}
//               onClick={handleSubmit}
//             />
//           </div>
//         }
//       >
//         <div className="space-y-4">
//           <Input
//             label="Course Title"
//             name="title"
//             placeholder="Enter course title"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//           />
//           <Textarea
//             label="Description"
//             placeholder="Course description..."
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             rows={4}
//           />
//           <Select
//             label="Category"
//             name="category"
//             options={["Programming", "Design", "Business"]}
//             value={category}
//             onChange={(e) => setCategory(e.target.value)}
//           />
//         </div>
//       </Modal>

//       {/* Large Content Modal with Scrolling */}
//       <Modal
//         isOpen={contentOpen}
//         onClose={() => setContentOpen(false)}
//         title="Terms and Conditions"
//         size="xl"
//       >
//         <div className="prose">
//           <p>Lorem ipsum dolor sit amet...</p>
//           {/* Long content will scroll */}
//         </div>
//       </Modal>

//       {/* Full Screen Modal */}
//       <Modal
//         isOpen={fullOpen}
//         onClose={() => setFullOpen(false)}
//         title="Video Player"
//         size="full"
//         showCloseButton={true}
//       >
//         <div className="h-full flex items-center justify-center">
//           <video controls className="w-full max-w-4xl">
//             <source src="/video.mp4" type="video/mp4" />
//           </video>
//         </div>
//       </Modal>
//     </>
//   );
// }

// Pro tips:

// Use size="sm" for confirmations/alerts
// Use size="md" for forms with 2-4 fields
// Use size="lg" for complex forms
// Use size="xl" for content/articles
// Use size="full" for media viewers
// Set closeOnOverlayClick={false} for forms to prevent accidental data loss