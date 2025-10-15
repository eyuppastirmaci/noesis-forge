export enum UserStatus {
  ACTIVE = "active",
  PENDING = "pending",
  SUSPENDED = "suspended",
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  roleID: string;
  role?: Role;
  // E2EE fields
  encryptionSalt?: string;
  encryptedFields?: {
    email?: { encrypted: string; iv: string };
    alternateEmail?: { encrypted: string; iv: string };
    phone?: { encrypted: string; iv: string };
    department?: { encrypted: string; iv: string };
    bio?: { encrypted: string; iv: string };
  };
}

export interface PublicUser {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  bio?: string;
  status: UserStatus;
  createdAt: string;
  role?: {
    id: string;
    name: string;
    displayName: string;
  };
}

export interface CreateUserRequest {
  email: string;
  username: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

export interface UpdateUserRequest {
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UserProfileResponse {
  user: User;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
