"use client";

import { Tooltip } from "react-tooltip";

export default function CustomTooltip({
  children,
  anchorSelect = "",
  place = "bottom",
  offset = 10,
}: {
  children: React.ReactNode;
  anchorSelect?: string;
  place?: "top" | "bottom" | "left" | "right" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end" | "right-start" | "right-end";
  offset?: number;
}) {
  return (
    <Tooltip
      anchorSelect={anchorSelect}
      place={place}
      offset={offset}
      style={{
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
      }}
    >
      {children}
    </Tooltip>
  );
}
