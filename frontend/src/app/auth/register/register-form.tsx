"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Form from "next/form";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import SubmitButton from "@/components/ui/SubmitButton";
import { registerAction, RegisterState } from "@/actions";

const initialState: RegisterState = {
  errors: [],
};

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [state, formAction] = useActionState(registerAction, initialState);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle successful registration redirect
  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state.success, state.redirectTo, router]);

  return (
    <Form action={formAction} className="space-y-6">
      {state.errors.length > 0 && (
        <div className="space-y-2">
          {state.errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-md text-sm"
            >
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Hidden username field to prevent autofill */}
      <input
        type="text"
        name="hidden-username"
        autoComplete="username"
        style={{ display: "none" }}
        tabIndex={-1}
        aria-hidden="true"
      />

      <Input
        label="Username"
        name="username"
        type="text"
        defaultValue={state.formData?.username || ""}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        required
      />

      <Input
        label="Full Name"
        name="name"
        type="text"
        defaultValue={state.formData?.name || ""}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        required
      />

      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={state.formData?.email || ""}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        required
      />

      <Input
        label="Password"
        name="password"
        type={isMounted && showPassword ? "text" : "password"}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
        fullWidth
        required
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        }
      />

      <Input
        label="Confirm Password"
        name="confirmPassword"
        type={isMounted && showConfirmPassword ? "text" : "password"}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
        fullWidth
        required
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        }
      />

      <SubmitButton fullWidth loadingText="Creating Account...">
        Sign Up
      </SubmitButton>
    </Form>
  );
} 