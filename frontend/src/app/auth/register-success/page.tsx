"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";

export default function RegisterSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Registering your account...');

  useEffect(() => {
    const email = searchParams.get('email');
    const password = searchParams.get('password');

    if (!email || !password) {
      setStatus('error');
      setMessage('Missing credentials');
      setTimeout(() => router.push('/auth/register'), 2000);
      return;
    }

    const autoLogin = async () => {
      try {
        setMessage('Account created successfully! Signing you in...');
        
        const result = await signIn("credentials", {
          identifier: email,
          password: password,
          redirect: false,
        });

        if (result?.error) {
          setStatus('error');
          setMessage('Registration successful, but auto-login failed. Redirecting to login...');
          setTimeout(() => router.push('/auth/login?registered=true'), 2000);
        } else {
          setStatus('success');
          setMessage('Welcome! Redirecting to dashboard...');
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1500);
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        setStatus('error');
        setMessage('Registration successful, but auto-login failed. Redirecting to login...');
        setTimeout(() => router.push('/auth/login?registered=true'), 2000);
      }
    };

    autoLogin();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            {status === 'loading' && (
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            )}
            {status === 'error' && (
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-red-500 text-xl">!</span>
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-bold mb-4">
            {status === 'loading' && 'Processing...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Almost there!'}
          </h2>
          
          <p className="text-muted-foreground">
            {message}
          </p>
          
          {status === 'loading' && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 