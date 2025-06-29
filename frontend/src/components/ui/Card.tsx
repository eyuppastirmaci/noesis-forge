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

export interface CardTitleProps {
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

const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = "",
}) => {
  return (
    <h3
      className={cn("font-semibold leading-none tracking-tight", className)}
    >
      {children}
    </h3>
  );
};

const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Content: typeof CardContent;
  Title: typeof CardTitle;
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
Card.Title = CardTitle;

export default Card;