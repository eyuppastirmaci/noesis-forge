import React, { createContext, useContext, useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface AccordionContextValue {
  openIds: Set<string>;
  toggle: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps {
  children: ReactNode;
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> & {
  Item: typeof AccordionItem;
  Title: typeof AccordionTitle;
  Content: typeof AccordionContent;
} = ({ children, allowMultiple = false, className = "space-y-2" }) => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      const isOpen = next.has(id);
      if (allowMultiple) {
        isOpen ? next.delete(id) : next.add(id);
      } else {
        next.clear();
        if (!isOpen) next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openIds, toggle, allowMultiple }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemContextValue {
  id: string;
  isOpen: boolean;
  toggle: () => void;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

export interface AccordionItemProps {
  id: string;
  children: ReactNode;
  className?: string;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ id, children, className = "border border-border rounded" }) => {
  const accordion = useContext(AccordionContext);
  if (!accordion) throw new Error("Accordion.Item must be inside Accordion");
  const isOpen = accordion.openIds.has(id);
  const toggle = () => accordion.toggle(id);

  return (
    <AccordionItemContext.Provider value={{ id, isOpen, toggle }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
};

interface AccordionTitleProps {
  children: ReactNode;
  className?: string;
}

const AccordionTitle: React.FC<AccordionTitleProps> = ({ children, className = "w-full p-3 flex items-center justify-between hover:bg-background-secondary" }) => {
  const itemCtx = useContext(AccordionItemContext);
  if (!itemCtx) throw new Error("Accordion.Title must be inside Accordion.Item");
  const { isOpen, toggle } = itemCtx;

  const rotation = isOpen ? "rotate-180" : "";

  return (
    <button type="button" onClick={toggle} className={cn("text-left", className)}>
      <div className="flex items-center gap-2">
        <ChevronDown className={cn("w-4 h-4 transform transition-transform", rotation)} />
        {children}
      </div>
    </button>
  );
};

interface AccordionContentProps {
  children: ReactNode;
  className?: string;
}

const AccordionContent: React.FC<AccordionContentProps> = ({ children, className = "px-4 pb-4" }) => {
  const itemCtx = useContext(AccordionItemContext);
  if (!itemCtx) throw new Error("Accordion.Content must be inside Accordion.Item");
  return itemCtx.isOpen ? <div className={className}>{children}</div> : null;
};

// Attach subcomponents
Accordion.Item = AccordionItem;
Accordion.Title = AccordionTitle;
Accordion.Content = AccordionContent;

export default Accordion; 