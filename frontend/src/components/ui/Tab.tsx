"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onTabChange?: (tab: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("Tab components must be used within a Tab component");
  }
  return context;
};

interface TabProps {
  defaultTab?: string;
  children: ReactNode;
  className?: string;
  onTabChange?: (tab: string) => void;
}

const Tab = ({ defaultTab, children, className, onTabChange }: TabProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab || "");

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, onTabChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabContext.Provider>
  );
};

interface TabTitleProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

const TabTitle = ({ value, children, disabled = false, className }: TabTitleProps) => {
  const { activeTab, setActiveTab, onTabChange } = useTabContext();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => {
        if (disabled) return;
        setActiveTab(value);
        if (onTabChange) onTabChange(value);
      }}
      disabled={disabled}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-info/50 focus:ring-offset-2 dark:focus:ring-offset-background",
        isActive
          ? "text-info border-b-2 border-info bg-info/5 dark:bg-info/10"
          : "text-foreground-secondary hover:text-foreground border-b-2 border-transparent hover:border-border",
        disabled ? "opacity-50 cursor-not-allowed hover:text-foreground-secondary hover:border-transparent" : "",
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

const TabContent = ({ value, children, className }: TabContentProps) => {
  const { activeTab } = useTabContext();

  if (activeTab !== value) {
    return null;
  }

  return <div className={cn("mt-4", className)}>{children}</div>;
};

interface TabListProps {
  children: ReactNode;
  className?: string;
}

const TabList = ({ children, className }: TabListProps) => {
  return (
    <div className={cn("flex border-b border-border", className)}>
      {children}
    </div>
  );
};

// Compound component pattern
Tab.Title = TabTitle;
Tab.Content = TabContent;
Tab.List = TabList;

export default Tab; 