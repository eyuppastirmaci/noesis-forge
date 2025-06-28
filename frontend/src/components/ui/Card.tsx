"use client";

import React from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "" }) => {
  return (
    <div className={cn("px-6 py-4 border-b border-border", className)}>
      {children}
    </div>
  );
};

const CardContent: React.FC<CardContentProps> = ({ children, className = "" }) => {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  );
};

const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Content: typeof CardContent;
} = ({ children, className = "" }) => {
  return (
    <div className={cn(
      "bg-background-secondary border border-border rounded-lg shadow-sm",
      className
    )}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Content = CardContent;

export default Card;