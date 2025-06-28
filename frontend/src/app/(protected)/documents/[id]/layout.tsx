import { ReactNode } from "react";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { documentService } from "@/services/document.services";

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
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      throw new Error('No access token');
    }

    const title = await documentService.getDocumentTitleServerSide(id, accessToken);

    return {
      title: `${title} - Noesis Forge`,
      description: `View and manage document: ${title}`,
    };
  } catch (error) {
    // If document not found or error occurred, return default metadata
    console.log('Metadata generation failed:', error);
    return {
      title: "Document - Noesis Forge",
      description: "Document details",
    };
  }
}

export default function DocumentsDetailLayout({ children }: Props) {
  return children;
}
