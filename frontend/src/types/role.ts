export enum PermissionCategory {
  DOCUMENT = "document",
  SEARCH = "search",
  CHAT = "chat",
  ADMIN = "admin",
}

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: PermissionCategory;
  isSystem: boolean;
  createdAt: string; 
  updatedAt: string; 
}

export interface Role {
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

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  permissionIDs?: string[];
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  permissionIDs?: string[];
}

export interface AssignRoleRequest {
  userID: string;
  roleID: string;
}

export interface RolesResponse {
  roles: Role[];
}

export interface RoleResponse {
  role: Role;
}

export interface PermissionsResponse {
  permissions: Permission[];
}

export interface PermissionsByCategoryResponse {
  permissions: Permission[];
}

export interface RoleOperationResponse {
  message: string;
  role?: Role;
}

export interface RoleAssignmentResponse {
  message: string;
}

export type PermissionsByCategory = {
  [K in PermissionCategory]: Permission[];
};

export interface RolePermissionMap {
  [roleId: string]: string[]; 
}
