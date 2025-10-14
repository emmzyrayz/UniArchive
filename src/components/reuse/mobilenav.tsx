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
  className = "",
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
      <Button
        variant={item.active ? "primary" : "none"}
        base="off"
        onClick={() => {
          item.onClick?.();
          onClose();
        }}
        className={`
          w-full justify-start font-normal rounded-lg transition-all duration-200
          ${level > 0 ? "ml-4" : ""}
          ${
            item.active
              ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }
          h-12 px-4
        `}
        icon={item.icon}
        iconPosition="left"
      >
        <span className="flex-1 text-left">{item.label}</span>
      </Button>
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
                className="cursor-pointer"
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
              className="text-gray-600 hover:text-gray-900 text-center py-2"
            >
              Help Center
            </a>
            <a
              href="/contact"
              className="text-gray-600 hover:text-gray-900 text-center py-2"
            >
              Contact
            </a>
            <a
              href="/privacy"
              className="text-gray-600 hover:text-gray-900 text-center py-2"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-gray-600 hover:text-gray-900 text-center py-2"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
