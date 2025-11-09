"use client";

import { Sparkles } from "lucide-react";

export default function SimilarityMatchingPage() {
  return (
    <div className="flex-1 max-h-[calc(100vh-102px)] overflow-y-scroll bg-background">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Similarity Matching</h1>
              <p className="text-sm text-foreground-secondary">
                Compare and match similar documents (Coming Soon)
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon State */}
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500/10 rounded-full mb-6">
            <Sparkles className="w-10 h-10 text-purple-500" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            Coming Soon
          </h3>
          <p className="text-foreground-secondary max-w-md mx-auto text-lg">
            Similarity Matching feature will allow you to compare documents and find matching patterns.
          </p>
        </div>
      </div>
    </div>
  );
}

