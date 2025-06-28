"use client";

import React, { useRef, ReactNode, useState, useId, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import IconButton from "./IconButton";
import { 
  useFocusTrap, 
  useScrollLock, 
  useModalStack, 
  useEscapeKey, 
  useClickOutside 
} from "@/hooks";

// Modal size variants
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preserveScrollPosition?: boolean;
  zIndex?: number;
  animate?: boolean;
}

interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

interface ModalContentProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

// Size classes mapping
const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-6xl mx-auto my-8 h-[calc(100vh-4rem)]"
};

// Animation variants with proper typing
const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  className = "",
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preserveScrollPosition = true,
  zIndex: customZIndex,
  animate = true
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const modalId = useId();
  const titleId = `modal-title-${modalId}`;
  const descriptionId = `modal-description-${modalId}`;

  // Use custom hooks
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);
  
  useScrollLock({ 
    isLocked: isOpen, 
    preservePosition: preserveScrollPosition 
  });
  
  const zIndex = useModalStack({ 
    modalId, 
    isOpen, 
    zIndex: customZIndex 
  });
  
  useEscapeKey({ 
    isActive: isOpen && closeOnEscape, 
    onEscape: onClose 
  });
  
  useClickOutside<HTMLDivElement>({ 
    ref: modalRef, 
    isActive: isOpen && closeOnOverlayClick, 
    onClickOutside: onClose 
  });

  // Handle SSR
  useEffect(() => {
    setContainer(document.body);
  }, []);

  if (!container) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={`fixed inset-0 flex items-center justify-center ${size === 'full' ? 'p-4' : 'p-4'}`}
          style={{ zIndex }}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-gray-900/50 dark:bg-gray-950/70 backdrop-blur-sm"
            variants={animate ? overlayVariants : undefined}
          />
          
          {/* Modal Container */}
          <motion.div
            ref={(node) => {
              modalRef.current = node;
              if (node) {
                focusTrapRef.current = node;
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={`
              relative w-full ${sizeClasses[size]} 
              bg-background border border-border rounded-lg shadow-xl 
              ${size === 'full' ? 'overflow-hidden flex flex-col' : 'overflow-hidden'}
              focus:outline-none focus:ring-2 focus:ring-primary/20
              ${className}
            `}
            variants={animate ? modalVariants : undefined}
            tabIndex={-1}
          >
            {/* Close Button */}
            <div className="absolute top-3 right-3 z-10">
              <IconButton
                Icon={X}
                onClick={onClose}
                variant="default"
                size="sm"
                bordered={false}
                className="hover:bg-background-secondary"
                aria-label="Close modal"
              />
            </div>
            
            {/* Modal Content */}
            <div className={`${size === 'full' ? 'p-4 flex-1 overflow-hidden' : 'p-6'}`}>
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  if (child.type === ModalHeader) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                      titleId
                    });
                  }
                  if (child.type === ModalContent) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                      descriptionId
                    });
                  }
                }
                return child;
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, container);
};

const ModalHeader = ({ 
  children, 
  className = "",
  titleId
}: ModalHeaderProps & { titleId?: string }) => {
  return (
    <div className={`mb-4 pr-8 ${className}`}>
      <h2 
        id={titleId}
        className="text-lg font-semibold text-foreground"
      >
        {children}
      </h2>
    </div>
  );
};

const ModalContent = ({ 
  children, 
  className = "",
  descriptionId
}: ModalContentProps & { descriptionId?: string }) => {
  return (
    <div 
      id={descriptionId}
      className={`mb-6 text-foreground-secondary ${className}`}
    >
      {children}
    </div>
  );
};

const ModalFooter = ({ children, className = "" }: ModalFooterProps) => {
  return (
    <div className={`flex justify-end space-x-3 pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
};

// Attach sub-components to Modal
Modal.Header = ModalHeader;
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;

export default Modal;