import { ReactNode } from "react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { API_CONFIG } from "@/config/api";
import { DOCUMENT_ENDPOINTS } from "@/types";

interface Props {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

interface GenerateMetadataProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  try {
    const { id } = await params;
    
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return {
        title: "Document - Noesis Forge",
        description: "Document details",
      };
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${DOCUMENT_ENDPOINTS.TITLE(id)}`,
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
      const title = data.data?.title;
      
      if (title) {
        return {
          title: `${title} - Noesis Forge`,
          description: `View and manage document: ${title}`,
        };
      }
    }

    // Fallback metadata
    return {
      title: "Document - Noesis Forge",
      description: "Document details",
    };
  } catch (error) {
    // If document not found or error occurred, return default metadata
    console.log("Metadata generation failed:", error);
    return {
      title: "Document - Noesis Forge",
      description: "Document details",
    };
  }
}

export default function DocumentsDetailLayout({ children }: Props) {
  return children;
}