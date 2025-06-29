import { ReactNode } from "react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/config/api";
import { API_ENDPOINTS } from "@/types";

interface Props {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  let title = "Profile - Noesis Forge";
  
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return {
        title,
        description: "View and edit your profile",
      };
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.FULL_NAME}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (response.ok) {
      const data = await response.json();
      const fullName = data.data?.fullName;
      
      if (fullName) {
        title = `${fullName} - Profile | Noesis Forge`;
      }
    }
  } catch (error) {
    console.log("Metadata generation failed:", error);
  }

  return {
    title,
    description: "View and edit your profile",
  };
}

export default function ProfilePageLayout({ children }: Props) {
  return children;
}