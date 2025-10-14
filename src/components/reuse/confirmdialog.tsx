import { Modal, Button, Alert } from "@/components/UI";
import { LuTriangleAlert, LuInfo, LuCircleAlert } from "react-icons/lu";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  showAlert?: boolean;
  alertMessage?: string;
  className?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  showAlert = true,
  alertMessage,
  className = "",
}: ConfirmDialogProps) {
  const variantConfig = {
    danger: {
      buttonClass: "bg-red-600 hover:bg-red-700",
      icon: <LuCircleAlert className="w-6 h-6" />,
      iconColor: "text-red-600",
      alertType: "error" as const,
      defaultAlert: "This action cannot be undone.",
    },
    warning: {
      buttonClass: "bg-yellow-600 hover:bg-yellow-700",
      icon: <LuTriangleAlert className="w-6 h-6" />,
      iconColor: "text-yellow-600",
      alertType: "warning" as const,
      defaultAlert: "Please review before proceeding.",
    },
    info: {
      buttonClass: "bg-blue-600 hover:bg-blue-700",
      icon: <LuInfo className="w-6 h-6" />,
      iconColor: "text-blue-600",
      alertType: "info" as const,
      defaultAlert: "You are about to make a change.",
    },
  };

  const config = variantConfig[variant];
  const displayAlert = alertMessage || config.defaultAlert;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
      showCloseButton={!loading}
      className={className}
    >
      <div className="space-y-4">
        {/* Icon and Message */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-medium mb-2">{message}</p>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
        </div>

        {/* Alert Message */}
        {showAlert && (
          <Alert
            type={config.alertType}
            message={displayAlert}
            showIcon={false}
            className="text-sm"
          />
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            label={cancelText}
            onClick={onClose}
            disabled={loading}
          />
          <Button
            variant="primary"
            label={confirmText}
            loading={loading}
            onClick={handleConfirm}
            className={config.buttonClass}
          />
        </div>
      </div>
    </Modal>
  );
}


// 📖 Usage Examples:
// 1. Basic Delete Confirmation
// tsxconst [showDeleteDialog, setShowDeleteDialog] = useState(false);

// <ConfirmDialog
//   isOpen={showDeleteDialog}
//   onClose={() => setShowDeleteDialog(false)}
//   onConfirm={async () => {
//     await deleteMaterial(materialId);
//     setShowDeleteDialog(false);
//   }}
//   title="Delete Material"
//   message="Are you sure you want to delete this material?"
//   variant="danger"
// />
// 2. With Description and Custom Alert
// tsx<ConfirmDialog
//   isOpen={showDialog}
//   onClose={() => setShowDialog(false)}
//   onConfirm={handleDelete}
//   title="Delete Course"
//   message="Are you sure you want to delete this course?"
//   description="This will remove all associated materials, assignments, and student progress."
//   alertMessage="This action is permanent and cannot be reversed."
//   confirmText="Delete Course"
//   variant="danger"
// />
// 3. Warning Dialog
// tsx<ConfirmDialog
//   isOpen={showWarning}
//   onClose={() => setShowWarning(false)}
//   onConfirm={handlePublish}
//   title="Publish Material"
//   message="Publish this material to all students?"
//   description="Once published, students will be notified and can access the content immediately."
//   variant="warning"
//   confirmText="Publish Now"
// />
// 4. Info Dialog
// tsx<ConfirmDialog
//   isOpen={showInfo}
//   onClose={() => setShowInfo(false)}
//   onConfirm={handleEnroll}
//   title="Enroll in Course"
//   message="Would you like to enroll in this course?"
//   description="You'll get access to all course materials and can track your progress."
//   variant="info"
//   confirmText="Enroll"
//   cancelText="Maybe Later"
// />
// 5. With Loading State
// tsxconst [deleting, setDeleting] = useState(false);

// <ConfirmDialog
//   isOpen={showDialog}
//   onClose={() => setShowDialog(false)}
//   onConfirm={async () => {
//     setDeleting(true);
//     try {
//       await api.delete(`/materials/${id}`);
//       setShowDialog(false);
//       toast.success("Material deleted successfully");
//     } catch (error) {
//       toast.error("Failed to delete material");
//     } finally {
//       setDeleting(false);
//     }
//   }}
//   title="Delete Material"
//   message="Delete this material permanently?"
//   variant="danger"
//   loading={deleting}
// />
// 6. Complete Example - Material Management
// tsx"use client";

// import { useState } from "react";
// import { ConfirmDialog } from "@/components/complex";
// import { Button } from "@/components/UI";

// export default function MaterialList() {
//   const [deleteDialog, setDeleteDialog] = useState<{
//     isOpen: boolean;
//     materialId: string | null;
//     materialName: string;
//   }>({
//     isOpen: false,
//     materialId: null,
//     materialName: "",
//   });
//   const [loading, setLoading] = useState(false);

//   const handleDeleteClick = (id: string, name: string) => {
//     setDeleteDialog({
//       isOpen: true,
//       materialId: id,
//       materialName: name,
//     });
//   };

//   const handleConfirmDelete = async () => {
//     if (!deleteDialog.materialId) return;

//     setLoading(true);
//     try {
//       const response = await fetch(`/api/materials/${deleteDialog.materialId}`, {
//         method: "DELETE",
//       });

//       if (!response.ok) throw new Error("Failed to delete");

//       // Refresh list or remove from state
//       console.log("Deleted successfully");
//       setDeleteDialog({ isOpen: false, materialId: null, materialName: "" });
//     } catch (error) {
//       console.error("Delete failed:", error);
//       alert("Failed to delete material");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       {materials.map((material) => (
//         <div key={material.id} className="flex justify-between items-center p-4">
//           <span>{material.name}</span>
//           <Button
//             label="Delete"
//             variant="outline"
//             onClick={() => handleDeleteClick(material.id, material.name)}
//           />
//         </div>
//       ))}

//       <ConfirmDialog
//         isOpen={deleteDialog.isOpen}
//         onClose={() =>
//           setDeleteDialog({ isOpen: false, materialId: null, materialName: "" })
//         }
//         onConfirm={handleConfirmDelete}
//         title="Delete Material"
//         message={`Are you sure you want to delete "${deleteDialog.materialName}"?`}
//         description="Students will no longer be able to access this material."
//         alertMessage="This action cannot be undone. All associated data will be permanently deleted."
//         confirmText="Delete Material"
//         cancelText="Keep Material"
//         variant="danger"
//         loading={loading}
//       />
//     </div>
//   );
// }
// 7. Multiple Actions
// tsxconst [dialogType, setDialogType] = useState<"delete" | "archive" | null>(null);

// <>
//   {/* Delete Dialog */}
//   {dialogType === "delete" && (
//     <ConfirmDialog
//       isOpen={true}
//       onClose={() => setDialogType(null)}
//       onConfirm={handleDelete}
//       title="Delete Item"
//       message="Permanently delete this item?"
//       variant="danger"
//     />
//   )}

//   {/* Archive Dialog */}
//   {dialogType === "archive" && (
//     <ConfirmDialog
//       isOpen={true}
//       onClose={() => setDialogType(null)}
//       onConfirm={handleArchive}
//       title="Archive Item"
//       message="Move this item to archive?"
//       description="You can restore it later from the archive."
//       variant="warning"
//       confirmText="Archive"
//     />
//   )}
// </>
// 8. Without Alert Message
// tsx<ConfirmDialog
//   isOpen={showDialog}
//   onClose={() => setShowDialog(false)}
//   onConfirm={handleAction}
//   title="Continue?"
//   message="Do you want to proceed with this action?"
//   variant="info"
//   showAlert={false}
// />
// 🎨 Features:

// ✅ Three variants - danger, warning, info with appropriate colors
// ✅ Alert integration - Shows contextual alert messages
// ✅ Custom alerts - Override default alert text
// ✅ Description support - Add detailed explanations
// ✅ Loading state - Disables buttons during async operations
// ✅ Async support - Handles Promise-based actions
// ✅ Prevents accidental close - Can't close during loading
// ✅ Accessible - Proper ARIA attributes from Modal
// ✅ Consistent icons - Uses lucide-react icons