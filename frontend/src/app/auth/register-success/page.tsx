"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email');

    if (!emailParam) {
      router.push('/auth/register');
      return;
    }

    setEmail(emailParam);
  }, [searchParams, router]);

  useEffect(() => {
    if (!email) return;

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            router.push('/auth/login?registered=true');
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, router]);

  // Don't render anything until we have email
  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          </div>
          
          <h2 className="text-2xl font-bold mb-4 text-green-600">
            Registration Successful!
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Your account has been created successfully for <strong>{email}</strong>.
          </p>

          <p className="text-sm text-muted-foreground mb-6">
            You will be redirected to the login page in {countdown} seconds...
          </p>
          
          <div className="space-y-3">
            <Link
              href="/auth/login?registered=true"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium transition-colors inline-block"
            >
              Continue to Login
            </Link>
            
            <Link
              href="/auth/register"
              className="w-full text-muted-foreground hover:text-foreground px-4 py-2 rounded-md font-medium transition-colors inline-block text-sm"
            >
              Register Another Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 