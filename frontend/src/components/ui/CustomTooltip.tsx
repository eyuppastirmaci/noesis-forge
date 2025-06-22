"use client";

import { Tooltip } from "react-tooltip";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function CustomTooltip({
  children,
  anchorSelect = "",
  place = "bottom",
  offset = 10,
}: {
  children: React.ReactNode;
  anchorSelect?: string;
  place?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end"
    | "right-start"
    | "right-end";
  offset?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <Tooltip
      anchorSelect={anchorSelect}
      place={place}
      offset={offset}
      style={{
        position: "fixed",
        color: "white",
        zIndex: 9999,
        opacity: 1,
        backgroundColor: "#000000",
        boxShadow:
          "rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px",
        maxWidth: 300,
        fontWeight: 700,
        borderRadius: 5,
        borderColor: "#353535",
        borderWidth: 1,
        wordBreak: "break-all",
        padding: "8px",
        pointerEvents: "none",
      }}
    >
      {children}
    </Tooltip>,
    document.body
  );
}
