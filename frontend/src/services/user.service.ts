import { AxiosInstance } from "axios";
import {
  User,
  PublicUser,
  UpdateUserRequest,
  ChangePasswordRequest,
  UserProfileResponse,
} from "@/types/user";

export class UserService {
  constructor(private api: AxiosInstance) {}

  // Get the current user's profile
  async getProfile(): Promise<User> {
    const response = await this.api.get<UserProfileResponse>("/user/profile");
    return response.data.user;
  }

  // Get the public profile of another user
  async getPublicProfile(userId: string): Promise<PublicUser> {
    const response = await this.api.get<{ user: PublicUser }>(
      `/users/${userId}`
    );
    return response.data.user;
  }

  // Update the current user's profile
  async updateProfile(data: UpdateUserRequest): Promise<User> {
    const response = await this.api.put<{ user: User }>("/user/profile", data);
    return response.data.user;
  }

  // Change the current user's password
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.api.post("/user/change-password", data);
  }

  // List all users (admin only)
  async getAllUsers(): Promise<User[]> {
    const response = await this.api.get<{ users: User[] }>("/admin/users");
    return response.data.users;
  }
}
