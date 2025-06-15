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
  Sparkle,
  ListOrdered,
} from "lucide-react";
import IconButton from "../ui/IconButton";
import BreadCrumb from "../BreadCrumb";
import GlobalSearch from "../GlobalSearch";
import IconLinkButton from "../ui/IconLinkButton";
import IconDropdownButton from "../ui/IconDropdownButton";
import CustomTooltip from "../ui/CustomTooltip";

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
      <div className="w-full grid grid-cols-3 items-center px-4 h-[80px]">
        <div className="flex items-center gap-2">
          <div className="w-[280px] h-[280px] bg-background-secondary animate-pulse rounded" />
        </div>
        <div className="flex justify-center">
          <div className="w-48 h-10 bg-background-secondary animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <div className="w-8 h-8 bg-background-secondary animate-pulse rounded-full" />
          <div className="w-16 h-4 bg-background-secondary animate-pulse rounded" />
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
      className="bg-background-secondary border border-border rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95"
    >
      <Link
        href="/settings"
        onClick={() => setIsDropdownOpen(false)}
        className="flex items-center gap-2 px-4 py-3 text-sm text-foreground no-underline rounded-t-md hover:bg-background dark:hover:bg-accent-soft"
      >
        <Settings className="w-4 h-4 text-foreground-secondary" />
        <span>Settings</span>
      </Link>

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
  );

  return (
    <>
      <div className="w-full grid grid-cols-3 items-center px-4 h-[80px]">
        {/* Left Section */}
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

        {/* Center Section */}
        <div className="flex justify-center">
          <GlobalSearch />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 justify-end">
          {/* Upload */}
          <IconLinkButton Icon={FileUp} href="/upload" className="btn-upload" />
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
            dropdownItems={[{ label: "Articles are being researched...", onClick: () => {} }]}
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
          <CustomTooltip anchorSelect=".btn-ai-status" place="left">AI Status</CustomTooltip>

          <div className="text-foreground-secondary mx-1.5">|</div>

          <div
            ref={avatarRef}
            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-background dark:hover:bg-accent-soft"
            onClick={toggleDropdown}
          >
            <div className="group w-9 h-9 bg-background border border-icon-button-border hover:border-icon-button-border-hover active:border-icon-button-border-active rounded-full flex items-center justify-center cursor-pointer">
              <User className="w-4.5 h-4.5 text-icon-button-icon group-hover:text-icon-button-icon-hover group-active:text-icon-button-icon-active" />
            </div>
            <span className="text-sm font-medium select-none">username</span>
            <ChevronDown
              className={`w-4 h-4 text-foreground-secondary ${
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