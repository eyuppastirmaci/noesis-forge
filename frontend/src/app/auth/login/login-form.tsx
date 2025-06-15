"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Form from "next/form";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import SubmitButton from "@/components/ui/SubmitButton";
import { loginAction, LoginState } from "@/actions";
import { toast } from "@/utils/toast";

const initialState: LoginState = {
  errors: [],
};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [state, formAction] = useActionState(loginAction, initialState);
  const [clearedFields, setClearedFields] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle successful login redirect
  useEffect(() => {
    if (state.success && state.credentials) {
      // First sign in with NextAuth to update session
      signIn("credentials", {
        identifier: state.credentials.identifier,
        password: state.credentials.password,
        redirect: false,
      }).then((result) => {
        if (result?.ok) {
          // Show welcome message with user name from action
          const userName = state.user?.name || state.user?.username || "User";
          toast.success(`Welcome ${userName}! You've successfully signed in.`);
          // Then redirect to the desired page
          router.push(state.redirectTo || "/");
        } else {
          console.error("NextAuth signIn failed:", result?.error);
          toast.error("Sign in completed but session update failed.");
          // Still redirect even if NextAuth fails
          router.push(state.redirectTo || "/");
        }
      });
    }
  }, [state.success, state.credentials, state.redirectTo, router]);

  // Handle field error clearing
  const handleFieldChange = (fieldName: string) => {
    setClearedFields(prev => new Set(prev).add(fieldName));
  };

  // Get field error, but return undefined if field was cleared
  const getFieldError = (fieldName: string) => {
    if (clearedFields.has(fieldName)) {
      return undefined;
    }
    return state.fieldErrors?.[fieldName as keyof typeof state.fieldErrors];
  };

  // Reset cleared fields when form is submitted (new state)
  useEffect(() => {
    setClearedFields(new Set());
  }, [state]);

  return (
    <Form action={formAction} className="space-y-6">
      {/* Show general errors only if there are no field-specific errors */}
      {state.errors.length > 0 && !state.fieldErrors && (
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
        label="Email or Username"
        name="identifier"
        type="text"
        defaultValue={state.formData?.identifier || ""}
        error={getFieldError("email") || getFieldError("username")}
        autoComplete="username"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        onChange={() => handleFieldChange("identifier")}
      />

      <Input
        label="Password"
        name="password"
        type={isMounted && showPassword ? "text" : "password"}
        error={getFieldError("password")}
        autoComplete="current-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
        fullWidth
        onChange={() => handleFieldChange("password")}
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

      <SubmitButton fullWidth loadingText="Signing In...">
        Sign In
      </SubmitButton>
    </Form>
  );
} 