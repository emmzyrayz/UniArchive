// Represents the various states or views within the Auth page
export type AuthView = "signin" | "signup" | "forgot" | "verify" | "reset";

// Shared props type for components that can trigger navigation between views
export interface AuthNavigationProps {
  onNavigate?: (view: AuthView) => void;
}

export interface AuthInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface SignInFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  token?: string;
}