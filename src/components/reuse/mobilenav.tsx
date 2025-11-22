import { ReactElement, useEffect } from "react";
import { Modal, Button, Avatar } from "@/components/UI";

interface MobileNavItem {
  id: string;
  label: string;
  icon: ReactElement;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  children?: MobileNavItem[];
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onProfileClick?: () => void;
  onLogin?: () => void;
  className?: string;
}

export default function MobileNav({
  isOpen,
  onClose,
  items,
  user,
  onProfileClick,
  onLogin,
  // className = "",
}: MobileNavProps) {
  // Prevent body scroll when mobile nav is open
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

  const renderNavItem = (item: MobileNavItem, level = 0) => (
    <div key={item.id} className="w-full">
      {/* Custom button instead of Button component for better control */}
      <button
        onClick={() => {
          item.onClick?.();
          onClose();
        }}
        className={`
          w-full flex items-center gap-3 h-12 px-4 rounded-lg 
          font-normal transition-all duration-200
          ${level > 0 ? "ml-4" : ""}
          ${
            item.active
              ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }
        `}
      >
        {/* Icon */}
        <span className="flex-shrink-0 flex items-center justify-center">
          {item.icon}
        </span>

        {/* Label */}
        <span className="flex-1 text-left">{item.label}</span>
      </button>

      {/* Render nested items if they exist */}
      {item.children && item.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => renderNavItem(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      closeOnOverlayClick={true}
      showCloseButton={true}
      className="p-0"
    >
      <div className="flex flex-col h-full">
        {/* User Section */}
        {user ? (
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar
                src={user.avatar}
                alt={user.name}
                size="lg"
                onClick={onProfileClick}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 border-b border-gray-200">
            <Button
              variant="primary"
              label="Sign In"
              onClick={() => {
                onLogin?.();
                onClose();
              }}
              className="w-full"
              base="on"
            />
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {items.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <a
              href="/help"
              className="text-gray-600 hover:text-gray-900 text-center py-2 transition-colors"
            >
              Help Center
            </a>
            <a
              href="/contact"
              className="text-gray-600 hover:text-gray-900 text-center py-2 transition-colors"
            >
              Contact
            </a>
            <a
              href="/privacy"
              className="text-gray-600 hover:text-gray-900 text-center py-2 transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-gray-600 hover:text-gray-900 text-center py-2 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
