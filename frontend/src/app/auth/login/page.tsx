import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { RegistrationSuccessMessage } from "./registration-success-message";

export default async function LoginPage() {
  // Check if user is already authenticated
  const session = await getServerSession();
  
  if (session) {
    // User is already logged in, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-20">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Sign In
          </h2>

          {/* Show registration success message if coming from registration */}
          <Suspense fallback={null}>
            <RegistrationSuccessMessage />
          </Suspense>

          <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
