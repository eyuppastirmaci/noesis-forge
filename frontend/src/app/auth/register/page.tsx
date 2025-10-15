import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
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
            Create Account
          </h2>

          <Suspense fallback={<div>Loading...</div>}>
            <RegisterForm />
          </Suspense>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
