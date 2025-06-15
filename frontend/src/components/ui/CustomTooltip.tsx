"use client";

import { Tooltip } from "react-tooltip";

export default function CustomTooltip({
  children,
  anchorSelect = "",
}: {
  children: React.ReactNode;
  anchorSelect?: string;
}) {
  return (
    <Tooltip
      anchorSelect={anchorSelect}
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
