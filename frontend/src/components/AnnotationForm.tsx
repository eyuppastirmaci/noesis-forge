"use client";

import React, { useState } from "react";
import { X, Save } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { CommentPosition } from "@/types";

interface AnnotationFormProps {
  position: CommentPosition;
  formPosition: { x: number; y: number };
  onSave: (content: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const AnnotationForm: React.FC<AnnotationFormProps> = ({
  position,
  formPosition,
  onSave,
  onCancel,
  isSubmitting,
}) => {
  const [content, setContent] = useState("");

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(content.trim());
  };

  return (
    <div
      className="fixed pointer-events-auto w-80"
      style={{
        left: `${formPosition.x}px`,
        top: `${formPosition.y}px`,
        transform: "translate(-50%, -114%)",
        zIndex: 10000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-background border-2 border-border rounded-xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground m-0">
            Add Annotation
          </h3>
          <button
            onClick={onCancel}
            className="text-foreground-secondary hover:text-foreground bg-transparent border-none cursor-pointer p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="text-xs text-foreground-secondary">
            Page {position.page}
          </div>

          <textarea
            value={content}
            onChange={(e) => {
              if (e.target.value.length <= 1000) {
                setContent(e.target.value);
              }
            }}
            placeholder="Write your annotation..."
            className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={isSubmitting}
            autoFocus
            maxLength={1000}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground-secondary">
              {content.length}/1000 characters
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!content.trim() || isSubmitting}
                className="px-3 py-1.5 text-sm rounded-md text-white flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationForm; 