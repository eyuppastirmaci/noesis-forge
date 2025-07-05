"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import CustomTooltip from "@/components/ui/CustomTooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shareQueries, shareMutations } from "@/services/share.service";
import { toast } from "@/utils";
import { getErrorMessage } from "@/types";
import { CreateUserShareRequest, AccessLevel } from "@/types/share";
import { Users, X, Plus, Trash2, Edit } from "lucide-react";

interface EditSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
}

interface UserShare {
  email: string;
  accessLevel: "view" | "download" | "edit";
}

const EditSharingModal: React.FC<EditSharingModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAccessLevel, setUserAccessLevel] = useState<
    "view" | "download" | "edit"
  >("view");
  const [newUserShares, setNewUserShares] = useState<UserShare[]>([]);

  const queryClient = useQueryClient();

  // Fetch existing shares for the document
  const {
    data: sharedByMeData,
    isLoading: isLoadingShares,
    error: sharesError,
  } = useQuery({
    ...shareQueries.sharedByMe(),
    enabled: isOpen && !!documentId,
  });

  // Find the current document's shares
  const currentDocumentShares =
    sharedByMeData?.find((item) => item.document.id === documentId)?.shares ||
    [];

  // Mutations
  const createUserShareMutation = useMutation(shareMutations.createUserShare());
  const revokeUserShareMutation = useMutation(shareMutations.revokeUserShare());

  const handleAddUser = () => {
    if (!userEmail || !userEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if user already exists in current shares
    const existsInCurrent = currentDocumentShares.some(
      (share) => share.sharedWith.email === userEmail
    );
    const existsInNew = newUserShares.some((share) => share.email === userEmail);

    if (existsInCurrent || existsInNew) {
      toast.error("This user is already shared with this document");
      return;
    }

    setNewUserShares((prev) => [
      ...prev,
      { email: userEmail, accessLevel: userAccessLevel },
    ]);
    setUserEmail("");
    setUserAccessLevel("view");
  };

  const handleRemoveNewUser = (email: string) => {
    setNewUserShares((prev) => prev.filter((share) => share.email !== email));
  };

  const handleUpdateNewUserAccess = (
    email: string,
    accessLevel: "view" | "download" | "edit"
  ) => {
    setNewUserShares((prev) =>
      prev.map((share) =>
        share.email === email ? { ...share, accessLevel } : share
      )
    );
  };

  const handleRevokeExistingShare = async (shareId: string, email: string) => {
    try {
      await revokeUserShareMutation.mutateAsync({
        shareId: shareId,
      });
      toast.success(`Access revoked for ${email}`);
      queryClient.invalidateQueries({ queryKey: shareQueries.sharedByMe().queryKey });
    } catch (error: any) {
      console.error("Failed to revoke share:", error);
      toast.error(`Failed to revoke access: ${getErrorMessage(error)}`);
    }
  };



  const handleSaveNewShares = async () => {
    if (newUserShares.length === 0) {
      onClose();
      return;
    }

    if (!documentId) return;

    try {
      // Group users by access level to make separate requests
      const groupedShares = newUserShares.reduce((acc, share) => {
        if (!acc[share.accessLevel]) {
          acc[share.accessLevel] = [];
        }
        acc[share.accessLevel].push(share.email);
        return acc;
      }, {} as Record<AccessLevel, string[]>);

      // Make separate API calls for each access level
      for (const [accessLevel, emails] of Object.entries(groupedShares)) {
        const request: CreateUserShareRequest = {
          emails,
          accessLevel: accessLevel as AccessLevel,
          message: `Document access has been shared with you.`,
        };

        await createUserShareMutation.mutateAsync({ documentId, request });
      }

      toast.success(`Document shared with ${newUserShares.length} new users`);
      setNewUserShares([]);
      queryClient.invalidateQueries({ queryKey: shareQueries.sharedByMe().queryKey });
      onClose();
    } catch (error) {
      toast.error(`Failed to share with users: ${getErrorMessage(error)}`);
    }
  };

  const reset = () => {
    setNewUserShares([]);
    setUserEmail("");
    setUserAccessLevel("view");
  };

  const handleClose = () => {
    if (!createUserShareMutation.isPending && !revokeUserShareMutation.isPending) {
      reset();
      onClose();
    }
  };

  const accessLevelOptions = [
    { value: "view", label: "View Only" },
    { value: "download", label: "View & Download" },
    { value: "edit", label: "View, Download & Edit" },
  ];

  const getAccessLevelBadge = (level: "view" | "download" | "edit") => {
    const variants = {
      view: "gray",
      download: "blue", 
      edit: "green",
    } as const;
    return variants[level] || "gray";
  };

  if (!isOpen || !documentId) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="lg"
        closeOnEscape
        closeOnOverlayClick
      >
        <Modal.Header>
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Document Sharing
          </div>
        </Modal.Header>
        
        <Modal.Content>
          <div className="space-y-6">
            {/* Current Shares */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Current Shares ({currentDocumentShares.length})
              </h3>
              
              {isLoadingShares ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : sharesError ? (
                <div className="text-center py-4">
                  <p className="text-error text-sm">Failed to load shares</p>
                </div>
              ) : currentDocumentShares.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <Users className="w-8 h-8 text-foreground-secondary mx-auto mb-2" />
                  <p className="text-sm text-foreground-secondary">
                    No users currently have access
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentDocumentShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {share.sharedWith.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            color={getAccessLevelBadge(share.accessLevel)}
                            className="text-xs"
                          >
                            {share.accessLevel}
                          </Badge>
                          {share.expiresAt && (
                            <span className="text-xs text-foreground-secondary">
                              Expires: {new Date(share.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          id={`revoke-share-${share.id}`}
                          onClick={() => handleRevokeExistingShare(share.id, share.sharedWith.email)}
                          disabled={revokeUserShareMutation.isPending}
                          className="p-2 text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <CustomTooltip anchorSelect={`#revoke-share-${share.id}`} place="bottom">
                          Revoke access
                        </CustomTooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Users */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Add New Users
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <Input
                    label="Email Address"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1"
                  />
                  <Select
                    options={accessLevelOptions}
                    value={userAccessLevel}
                    onChange={(value) => setUserAccessLevel(value as any)}
                    className="w-40"
                  />
                  <Button
                    onClick={handleAddUser}
                    variant="primary"
                    className="flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* New Users List */}
                {newUserShares.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground-secondary">
                      Users to be added:
                    </p>
                    {newUserShares.map((share) => (
                      <div
                        key={share.email}
                        className="flex items-center gap-3 p-3 bg-info/5 rounded-lg border border-info/20"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {share.email}
                          </p>
                          <Badge
                            color={getAccessLevelBadge(share.accessLevel)}
                            className="text-xs mt-1"
                          >
                            {share.accessLevel}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Select
                            options={accessLevelOptions}
                            value={share.accessLevel}
                            onChange={(value) =>
                              handleUpdateNewUserAccess(share.email, value as any)
                            }
                            className="w-32"
                          />
                          
                          <button
                            onClick={() => handleRemoveNewUser(share.email)}
                            className="p-2 text-danger hover:bg-danger/10 rounded transition-colors"
                            title="Remove from list"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal.Content>
        
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={createUserShareMutation.isPending || revokeUserShareMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveNewShares}
            disabled={createUserShareMutation.isPending || revokeUserShareMutation.isPending}
          >
            {createUserShareMutation.isPending
              ? "Saving..."
              : newUserShares.length > 0
              ? `Share with ${newUserShares.length} ${newUserShares.length === 1 ? 'User' : 'Users'}`
              : "Close"}
          </Button>
        </Modal.Footer>
      </Modal>


    </>
  );
};

export default EditSharingModal; 