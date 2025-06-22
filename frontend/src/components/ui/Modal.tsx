"use client";

import React, { useEffect, useRef, ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import IconButton from "./IconButton";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
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

const Modal = ({ isOpen, onClose, children, className = "" }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 dark:bg-gray-950/70 backdrop-blur-sm" />
      
      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full max-w-md mx-4 bg-background border border-border rounded-lg shadow-xl ${className}`}
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
          />
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const ModalHeader = ({ children, className = "" }: ModalHeaderProps) => {
  return (
    <div className={`mb-4 pr-8 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground">
        {children}
      </h2>
    </div>
  );
};

const ModalContent = ({ children, className = "" }: ModalContentProps) => {
  return (
    <div className={`mb-6 text-foreground-secondary ${className}`}>
      {children}
    </div>
  );
};

const ModalFooter = ({ children, className = "" }: ModalFooterProps) => {
  return (
    <div className={`flex justify-end space-x-3 ${className}`}>
      {children}
    </div>
  );
};

// Attach sub-components to Modal
Modal.Header = ModalHeader;
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;

export default Modal;