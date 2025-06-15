"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Settings,
  LogOut,
  User,
  FileUp,
  FileClock,
  Bell,
  Loader,
  Bot,
  Activity,
  List,
  ListTree,
  Server,
  LoaderCircle,
  Sparkle,
  ListOrdered,
} from "lucide-react";
import IconButton from "../ui/IconButton";
import BreadCrumb from "../BreadCrumb";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const { theme, resolvedTheme } = useTheme();
  const avatarRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

      if (
        avatarRef.current &&
        !avatarRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
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
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      updateDropdownPosition();
    }
  }, [isDropdownOpen]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-between items-center px-4 h-[80px]">
        <div className="flex items-center gap-2">
          <div className="w-[280px] h-[280px] bg-secondary animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-secondary animate-pulse rounded-full" />
          <div className="w-16 h-4 bg-secondary animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const getLogoSrc = () => {
    const currentTheme = resolvedTheme || theme;
    if (currentTheme === "dark") {
      return "/assets/images/logo/logo-dark.svg";
    }
    return "/assets/images/logo/logo-light.svg";
  };

  const handleLogout = () => {
    // TODO: Implement logout functionality
    console.log("Logout clicked");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
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
      className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 d"
    >
      <Link
        href="/settings"
        onClick={() => setIsDropdownOpen(false)}
        className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--foreground)] no-underline rounded-t-md hover:bg-[var(--background)] dark:hover:bg-[var(--accent-soft)]"
      >
        <Settings className="w-4 h-4 text-[var(--foreground-secondary)]" />
        <span>Settings</span>
      </Link>

      <button
        onClick={() => {
          handleLogout();
          setIsDropdownOpen(false);
        }}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[var(--error)] bg-transparent border-none text-left rounded-b-md hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <LogOut className="w-4 h-4 text-[var(--error)]" />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <>
      <div className="w-full flex justify-between items-center px-4 h-[80px]">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Image
              src={getLogoSrc()}
              alt="Noesis Forge"
              width={220}
              height={220}
              className={`object-contain opacity-90 hover:opacity-100 `}
            />
          </Link>
          <BreadCrumb />
        </div>

        <div>Global Search</div>

        <div className="relative flex items-center gap-3">
          {/* Upload */}
          <IconButton Icon={FileUp} onClick={() => {}} className="btn-upload" />

          {/* Recent Documents */}
          <IconButton Icon={FileClock} onClick={() => {}} className="btn-recent-documents" />

          {/* Notifications */}
          <IconButton Icon={Bell} onClick={() => {}} className="btn-notifications" />

          {/* Processing Queue */}
          <IconButton Icon={ListOrdered} onClick={() => {}} className="btn-processing-queue" />

          {/* AI Status */}
          <IconButton Icon={Sparkle} onClick={() => {}} className="btn-ai-status" />

          <div className="text-[var(--foreground-secondary)] mx-1.5">|</div>

          <div
            ref={avatarRef}
            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[var(--background)] dark:hover:bg-[var(--accent-soft)]"
            onClick={toggleDropdown}
          >
            <div className="group w-9 h-9 bg-[var(--background)] border border-[var(--icon-button-border)] hover:border-[var(--icon-button-border-hover)] active:border-[var(--icon-button-border-active)] rounded-full flex items-center justify-center cursor-pointer">
              <User className="w-4.5 h-4.5 text-[var(--icon-button-icon)] group-hover:text-[var(--icon-button-icon-hover)] group-active:text-[var(--icon-button-icon-active)]" />
            </div>
            <span className="text-sm font-medium select-none">username</span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--foreground-secondary)] ${
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
