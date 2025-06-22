"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export function RegistrationSuccessMessage() {
  const searchParams = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "registration-success") {
      setShowMessage(true);
      // Hide message after 5 seconds
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  if (!showMessage) {
    return null;
  }

  return (
    <div className="mb-6 bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-3 rounded-md flex items-center gap-3">
      <CheckCircle size={20} />
      <div>
        <p className="font-medium">Account created successfully!</p>
        <p className="text-sm opacity-90">Please sign in with your new account.</p>
      </div>
    </div>
  );
} 