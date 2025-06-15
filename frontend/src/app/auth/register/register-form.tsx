"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Form from "next/form";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import SubmitButton from "@/components/ui/SubmitButton";
import { registerAction, RegisterState } from "@/actions";
import { toast } from "@/utils/toast";

const initialState: RegisterState = {
  errors: [],
};

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [state, formAction] = useActionState(registerAction, initialState);
  const [clearedFields, setClearedFields] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle successful registration and auto-login
  useEffect(() => {
    if (state.success && state.loginCredentials) {
      // Auto-login after successful registration
      signIn("credentials", {
        identifier: state.loginCredentials.identifier,
        password: state.loginCredentials.password,
        redirect: false,
      }).then((result) => {
        if (result?.ok) {
          // Show welcome message with user name from action
          const userName = state.user?.name || state.user?.username || "User";
          toast.success(`Welcome ${userName}!`);
          // Then redirect to the desired page
          router.push(state.redirectTo || "/");
        } else {
          console.error("NextAuth signIn failed after registration:", result?.error);
          toast.info("Account created successfully! Please sign in.");
          // Still redirect even if NextAuth fails
          router.push(state.redirectTo || "/");
        }
      });
    }
  }, [state.success, state.loginCredentials, state.redirectTo, router]);

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
        label="Username"
        name="username"
        type="text"
        defaultValue={state.formData?.username || ""}
        error={getFieldError("username")}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        onChange={() => handleFieldChange("username")}
      />

      <Input
        label="Full Name"
        name="name"
        type="text"
        defaultValue={state.formData?.name || ""}
        error={getFieldError("name")}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        onChange={() => handleFieldChange("name")}
      />

      <Input
        label="Email"
        name="email"
        defaultValue={state.formData?.email || ""}
        error={getFieldError("email")}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        fullWidth
        onChange={() => handleFieldChange("email")}
      />

      <Input
        label="Password"
        name="password"
        type={isMounted && showPassword ? "text" : "password"}
        error={getFieldError("password")}
        autoComplete="new-password"
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

      <Input
        label="Confirm Password"
        name="confirmPassword"
        type={isMounted && showConfirmPassword ? "text" : "password"}
        error={getFieldError("confirmPassword")}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
        fullWidth
        onChange={() => handleFieldChange("confirmPassword")}
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