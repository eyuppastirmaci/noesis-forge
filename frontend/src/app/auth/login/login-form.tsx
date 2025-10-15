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
import { toast, setAuthTokens } from "@/utils";

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
    if (state.success && state.credentials && state.user && state.tokens) {
      // Derive E2EE master key on client-side (after successful login)
      const deriveKey = async () => {
        if ((state.user as any)?.encryptionSalt && state.credentials?.password) {
          try {
            const { handleLoginEncryption } = await import('@/lib/crypto/loginEncryption');
            await handleLoginEncryption(
              state.credentials!.password,
              (state.user as any).encryptionSalt
            );
          } catch (error) {
            console.error('Failed to derive master key on client:', error);
          }
        }
      };
      
      // Derive key first, then proceed with authentication
      deriveKey().then(() => {
        // Set cookies client-side using utility function
        if (state.tokens) {
          setAuthTokens(state.tokens);
        }

        // Update NextAuth session with user credentials and info
        signIn("credentials", {
          identifier: state.credentials!.identifier,
          password: state.credentials!.password,
          // Pass user info as additional data (custom fields)
          name: state.user!.name,
          username: state.user!.username,
          email: state.user!.email,
          avatar: state.user!.avatar,
          redirect: false,
        }).then((result) => {
          const userName = state.user?.name || state.user?.username || "User";
          if (result?.ok) {
            toast.info(`Welcome ${userName}`);
            router.push(state.redirectTo || "/dashboard");
          } else {
            // Even if NextAuth fails, we have cookies, so just redirect
            toast.info(`Welcome ${userName}`);
            router.push(state.redirectTo || "/dashboard");
          }
        });
      });
    }
  }, [state.success, state.credentials, state.user, state.tokens, state.redirectTo, router]);

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
            className="text-muted-foreground hover:text-foreground flex items-center justify-center p-0 border-0 bg-transparent"
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