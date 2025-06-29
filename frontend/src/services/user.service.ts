import {
  User,
  PublicUser,
  UpdateUserRequest,
  ChangePasswordRequest,
  UserProfileResponse,
} from "@/types/user";
import { apiClient } from "@/lib/api";

export class UserService {
  constructor() {}

  // Get the current user's profile
  async getProfile(): Promise<User> {
    const response = await apiClient.get<UserProfileResponse>("/user/profile");
    return response.data.user;
  }

  // Get the public profile of another user
  async getPublicProfile(userId: string): Promise<PublicUser> {
    const response = await apiClient.get<{ user: PublicUser }>(
      `/users/${userId}`
    );
    return response.data.user;
  }

  // Update the current user's profile
  async updateProfile(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient.put<{ user: User }>("/user/profile", data);
    return response.data.user;
  }

  // Change the current user's password
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post("/user/change-password", data);
  }

  // List all users (admin only)
  async getAllUsers(): Promise<User[]> {
    const response = await apiClient.get<{ users: User[] }>("/admin/users");
    return response.data.users;
  }
}

export const userService = new UserService();
