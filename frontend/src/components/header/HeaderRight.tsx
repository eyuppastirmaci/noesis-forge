"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronDown,
  Settings,
  LogOut,
  User,
  FileUp,
  FileClock,
  Bell,
  Sparkle,
  ListOrdered,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import IconLinkButton from "../ui/IconLinkButton";
import IconDropdownButton from "../ui/IconDropdownButton";
import CustomTooltip from "../ui/CustomTooltip";
import Button from "../ui/Button";

export default function HeaderRight() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const avatarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateDropdownPosition = () => {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      const dropdownWidth = 200;
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - dropdownWidth,
        width: dropdownWidth,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Handle user dropdown
      if (
        avatarRef.current &&
        !avatarRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }

      // Handle mobile menu
      if (
        mobileButtonRef.current &&
        !mobileButtonRef.current.contains(target) &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleScroll = () => {
      if (isDropdownOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isDropdownOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDropdownOpen, isMobileMenuOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      updateDropdownPosition();
    }
  }, [isDropdownOpen]);

  // Loading state
  if (!mounted || status === "loading") {
    return (
      <div className="flex items-center gap-1 sm:gap-2 justify-end">
        <div className="w-8 h-8 bg-background-secondary animate-pulse rounded sm:hidden" />
        <div className="hidden sm:block w-20 h-8 bg-background-secondary animate-pulse rounded" />
        <div className="w-8 h-8 sm:w-20 bg-background-secondary animate-pulse rounded" />
      </div>
    );
  }

  // Not authenticated - show Sign In / Sign Up buttons
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center gap-2 sm:gap-3 justify-end">
        {/* Settings - hidden on mobile */}
        <div className="hidden sm:block">
          <IconLinkButton Icon={Settings} href="/settings" className="btn-settings" />
          <CustomTooltip anchorSelect=".btn-settings">Settings</CustomTooltip>
        </div>
        
        <Link
          href="/auth/login"
          className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-foreground hover:text-foreground-secondary transition-colors"
        >
          Sign In
        </Link>
        <Link href="/auth/register">
          <Button variant="primary" size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  // Authenticated - show full header
  const handleLogout = async () => {
    try {
      // Call frontend logout API route which handles both backend and NextAuth logout
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Logout API failed silently
      }
      
      // Sign out from NextAuth (clears NextAuth session)
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      await signOut({ redirect: true, callbackUrl: "/" });
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const DropdownContent = () => (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999,
      }}
      className="bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95"
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-medium">{session?.user?.name || "User"}</p>
        <p className="text-xs text-foreground-secondary">
          {session?.user?.email}
        </p>
      </div>

      <Link
        href="/profile"
        onClick={() => setIsDropdownOpen(false)}
        className="flex items-center gap-2 px-4 py-3 text-sm text-foreground no-underline hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <User className="w-4 h-4 text-foreground-secondary" />
        <span>Profile</span>
      </Link>

      <Link
        href="/settings"
        onClick={() => setIsDropdownOpen(false)}
        className="flex items-center gap-2 px-4 py-3 text-sm text-foreground no-underline hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <Settings className="w-4 h-4 text-foreground-secondary" />
        <span>Settings</span>
      </Link>

      <div className="border-t border-border">
        <button
          onClick={() => {
            handleLogout();
            setIsDropdownOpen(false);
          }}
          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-error bg-transparent border-none text-left rounded-b-md hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <LogOut className="w-4 h-4 text-error" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  const MobileMenuContent = () => (
    <div
      ref={mobileMenuRef}
      className="absolute top-full right-0 mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50 animate-in fade-in-0 zoom-in-95 sm:hidden"
    >
      <div className="py-1">
        <Link
          href="/documents/recent"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          <FileClock className="w-4 h-4" />
          <span>Recent Documents</span>
        </Link>
        
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-gray-200 dark:hover:bg-gray-800 text-left"
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-gray-200 dark:hover:bg-gray-800 text-left"
        >
          <ListOrdered className="w-4 h-4" />
          <span>Processing Queue</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-gray-200 dark:hover:bg-gray-800 text-left"
        >
          <Sparkle className="w-4 h-4" />
          <span>AI Status</span>
        </button>

        <div className="border-t border-border mt-1 pt-1">
          <Link
            href="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );

  // Get first letter of username for avatar
  const avatarLetter =
    session?.user?.name?.[0]?.toUpperCase() ||
    session?.user?.username?.[0]?.toUpperCase() ||
    "U";

  return (
    <>
      <div className="flex items-center gap-1 sm:gap-3 justify-end">
        {/* Mobile Layout */}
        <div className="flex items-center gap-1 sm:hidden">
          {/* Upload - always visible */}
          <IconLinkButton Icon={FileUp} href="/documents/upload" className="btn-upload-mobile p-1.5" />
          
          {/* Mobile More Menu */}
          <div className="relative">
            <button
              ref={mobileButtonRef}
              onClick={toggleMobileMenu}
              className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </button>
            {isMobileMenuOpen && <MobileMenuContent />}
          </div>

          {/* User Avatar */}
          <div
            ref={avatarRef}
            className="flex items-center cursor-pointer p-1 rounded-lg hover:bg-background-secondary transition-colors"
            onClick={toggleDropdown}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200" style={{
              backgroundColor: 'var(--avatar-background)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--avatar-border)'
            }}>
              <span className="text-xs font-medium select-none" style={{
                color: 'var(--avatar-text)'
              }}>
                {avatarLetter}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center gap-3 justify-end">
          {/* Upload */}
          <IconLinkButton Icon={FileUp} href="/documents/upload" className="btn-upload" />
          <CustomTooltip anchorSelect=".btn-upload">Upload</CustomTooltip>

          {/* Recent Documents */}
          <IconDropdownButton
            Icon={FileClock}
            dropdownItems={[
              { label: "Illusion of Thinking Paper", onClick: () => {} },
            ]}
            className="btn-recent-documents"
          />
          <CustomTooltip anchorSelect=".btn-recent-documents" place="left">
            Recent Documents
          </CustomTooltip>

          {/* Notifications */}
          <IconDropdownButton
            Icon={Bell}
            dropdownItems={[
              { label: "Your Search Processing Completed!", onClick: () => {} },
            ]}
            className="btn-notifications"
          />
          <CustomTooltip anchorSelect=".btn-notifications" place="left">
            Notifications
          </CustomTooltip>

          {/* Processing Queue */}
          <IconDropdownButton
            Icon={ListOrdered}
            dropdownItems={[
              { label: "Articles are being researched...", onClick: () => {} },
            ]}
            className="btn-processing-queue"
          />
          <CustomTooltip anchorSelect=".btn-processing-queue" place="left">
            Processing Queue
          </CustomTooltip>

          {/* AI Status */}
          <IconDropdownButton
            Icon={Sparkle}
            dropdownItems={[{ label: "Ollama is running...", onClick: () => {} }]}
            className="btn-ai-status"
          />
          <CustomTooltip anchorSelect=".btn-ai-status" place="left">
            AI Status
          </CustomTooltip>

          <div className="text-foreground-secondary mx-1.5">|</div>

          <div
            ref={avatarRef}
            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-background-secondary transition-colors"
            onClick={toggleDropdown}
          >
            <div className="group w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200" style={{
              backgroundColor: 'var(--avatar-background)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--avatar-border)'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--avatar-border-hover)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--avatar-border)';
            }}>
              <span className="text-sm font-medium select-none" style={{
                color: 'var(--avatar-text)'
              }}>
                {avatarLetter}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground select-none">
              {session?.user?.name || session?.user?.username || "User"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-foreground-secondary transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {/* Portal Dropdown */}
      {isDropdownOpen &&
        typeof document !== "undefined" &&
        createPortal(<DropdownContent />, document.body)}
    </>
  );
}
