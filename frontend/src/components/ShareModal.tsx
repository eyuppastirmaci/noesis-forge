"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import Tab from "@/components/ui/Tab";
import NumberInput from "@/components/ui/NumberInput";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SwitchButton from "@/components/ui/SwitchButton";
import Badge from "@/components/ui/Badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentMutations } from "@/services/document.service";
import { shareMutations } from "@/services/share.service";
import { toast } from "@/utils";
import { CreateShareRequest } from "@/types";
import { CreateUserShareRequest, AccessLevel } from "@/types/share";
import { Copy, Check, ExternalLink, Link2, Users, X, Plus } from "lucide-react";
import CustomTooltip from "@/components/ui/CustomTooltip";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

interface UserShare {
  email: string;
  accessLevel: "view" | "download" | "edit";
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  // Link-based sharing state
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(7);
  const [maxDownloads, setMaxDownloads] = useState<number | undefined>(10);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [hasExpiry, setHasExpiry] = useState<boolean>(true);
  const [hasDownloadLimit, setHasDownloadLimit] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // User-based sharing state
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAccessLevel, setUserAccessLevel] = useState<
    "view" | "download" | "edit"
  >("view");
  const [userShares, setUserShares] = useState<UserShare[]>([]);
  const [userExpiresInDays, setUserExpiresInDays] = useState<
    number | undefined
  >(30);
  const [userHasExpiry, setUserHasExpiry] = useState<boolean>(true);

  const queryClient = useQueryClient();
  const shareMutation = useMutation(documentMutations.share());
  const userShareMutation = useMutation(shareMutations.createUserShare());

  const handleCreateLink = async () => {
    const req: CreateShareRequest = {
      expiresInDays: hasExpiry ? expiresInDays || 0 : 0,
      maxDownloads: hasDownloadLimit ? maxDownloads : undefined,
    };
    try {
      const res = await shareMutation.mutateAsync({ documentId, request: req });
      setGeneratedLink(`http://${res.shareURL}`);
      queryClient.invalidateQueries({
        queryKey: ["documents", "shares", documentId],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create link");
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    if (!generatedLink) return;
    window.open(generatedLink, "_blank", "noopener,noreferrer");
  };

  const handleAddUser = () => {
    if (!userEmail || !userEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (userShares.some((share) => share.email === userEmail)) {
      toast.error("This user is already in the share list");
      return;
    }

    setUserShares((prev) => [
      ...prev,
      { email: userEmail, accessLevel: userAccessLevel },
    ]);
    setUserEmail("");
    setUserAccessLevel("view");
  };

  const handleRemoveUser = (email: string) => {
    setUserShares((prev) => prev.filter((share) => share.email !== email));
  };

  const handleUpdateUserAccess = (
    email: string,
    accessLevel: "view" | "download" | "edit"
  ) => {
    setUserShares((prev) =>
      prev.map((share) =>
        share.email === email ? { ...share, accessLevel } : share
      )
    );
  };

  const handleShareWithUsers = async () => {
    if (userShares.length === 0) {
      toast.error("Please add at least one user to share with");
      return;
    }

    try {
      // Group users by access level to make separate requests
      const groupedShares = userShares.reduce((acc, share) => {
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
          expiresInDays: userHasExpiry ? userExpiresInDays : undefined,
          message: `Document has been shared with you.`,
        };

        await userShareMutation.mutateAsync({ documentId, request });
      }

      toast.success(`Document shared with ${userShares.length} users`);

      // Reset the form
      setUserShares([]);
      setUserEmail("");
      setUserAccessLevel("view");

      queryClient.invalidateQueries({
        queryKey: ["documents", "shares", documentId],
      });

      // Close the modal after successful user sharing
      onClose();
    } catch (err: any) {
      toast.error(`Failed to share with users: ${err.message}`);
    }
  };

  const reset = () => {
    setGeneratedLink(null);
    setExpiresInDays(7);
    setMaxDownloads(10);
    setHasExpiry(true);
    setHasDownloadLimit(true);
    setIsCopied(false);
    setUserShares([]);
    setUserEmail("");
    setUserAccessLevel("view");
    setUserExpiresInDays(30);
    setUserHasExpiry(true);
  };

  const handleClose = () => {
    if (!shareMutation.isPending && !userShareMutation.isPending) {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      closeOnEscape
      closeOnOverlayClick
    >
      <Modal.Header>Share Document</Modal.Header>
      <Modal.Content>
        <Tab defaultTab="public-link">
          <Tab.List>
            <Tab.Title value="public-link">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                <span>Generate Public Link</span>
              </div>
            </Tab.Title>
            <Tab.Title value="share-users">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Share with Users</span>
                {userShares.length > 0 && (
                  <Badge color="blue" className="text-xs">
                    {userShares.length}
                  </Badge>
                )}
              </div>
            </Tab.Title>
          </Tab.List>

          {/* Public Link Tab */}
          <Tab.Content value="public-link">
        {generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground-secondary">
                Shared Document Link
              </h3>
              <div className="flex items-center gap-2 p-3 bg-background-secondary rounded-lg border border-border">
                    <p className="flex-1 text-sm font-mono text-foreground break-all">
                  {generatedLink}
                </p>
              </div>
                  <div className="flex items-center justify-start gap-4 mt-4">
                <button
                  id="open-new-tab-btn"
                  onClick={handleOpenInNewTab}
                      className="flex items-center justify-center w-8 h-8 text-foreground hover:text-foreground-secondary transition-colors"
                >
                      <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  id="copy-link-btn"
                  onClick={handleCopy}
                      className="flex items-center justify-center w-8 h-8 text-foreground hover:text-foreground-secondary transition-colors"
                >
                  {isCopied ? (
                        <Check className="w-5 h-5 text-success" />
                  ) : (
                        <Copy className="w-5 h-5" />
                  )}
                </button>
                    <CustomTooltip
                      anchorSelect="#open-new-tab-btn"
                      place="bottom"
                    >
                  Open in new tab
                </CustomTooltip>
                <CustomTooltip anchorSelect="#copy-link-btn" place="bottom">
                  {isCopied ? "Copied!" : "Copy link"}
                </CustomTooltip>
              </div>
            </div>
          </div>
        ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-foreground-secondary">
                    Create a shareable link that anyone can use to access this
                    document
                  </p>
                </div>

            <div className="relative">
              <SwitchButton
                checked={hasExpiry}
                onChange={setHasExpiry}
                className="absolute top-0.25 left-29"
              />
                  <div className="flex items-center gap-2 pr-12">
                <NumberInput
                  min={1}
                  value={hasExpiry ? expiresInDays : ""}
                  onChange={setExpiresInDays}
                  disabled={!hasExpiry}
                      placeholder={hasExpiry ? "" : "No expiration"}
                  className="flex-1"
                  label="Expires in (days)"
                />
              </div>
            </div>

            <div className="relative">
              <SwitchButton
                checked={hasDownloadLimit}
                onChange={setHasDownloadLimit}
                className="absolute top-0.25 left-28"
              />
                  <div className="flex items-center gap-2 pr-12">
                <NumberInput
                  min={1}
                  value={hasDownloadLimit ? maxDownloads : ""}
                  onChange={setMaxDownloads}
                  disabled={!hasDownloadLimit}
                  placeholder={hasDownloadLimit ? "" : "No download limit"}
                  className="flex-1"
                  label="Download limit"
                />
              </div>
            </div>
          </div>
        )}

            {/* Footer buttons for Public Link tab */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={shareMutation.isPending}
        >
          Close
        </Button>
        {!generatedLink && (
          <Button
            variant="primary"
                  onClick={handleCreateLink}
            disabled={shareMutation.isPending}
          >
                  {shareMutation.isPending ? (
                    <LoadingSpinner />
                  ) : (
                    "Generate Link"
                  )}
          </Button>
        )}
            </div>
          </Tab.Content>

          {/* Share with Users Tab */}
          <Tab.Content value="share-users">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-foreground-secondary">
                  Share this document with specific users by email
                </p>
              </div>

              {/* Add User Form */}
              <div className="space-y-4 p-4 bg-background-secondary rounded-lg border border-border">
                <div className="flex gap-3 items-end">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="flex-1"
                    label="Email Address"
                  />
                  <div className="w-48">
                    <label className="block text-sm font-medium text-foreground-secondary mb-2">
                      Access Level
                    </label>
                    <Select
                      value={userAccessLevel}
                      onChange={(value) =>
                        setUserAccessLevel(
                          value as "view" | "download" | "edit"
                        )
                      }
                      options={accessLevelOptions}
                      placeholder="Select access level"
                      className="w-full"
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleAddUser}
                  disabled={!userEmail}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              {/* Users List */}
              {userShares.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">
                    Users to share with ({userShares.length})
                  </h4>
                  <div className="space-y-2">
                    {userShares.map((share, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-background-secondary rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {share.email}
                          </span>
                          <Badge
                            color={getAccessLevelBadge(share.accessLevel)}
                            className="text-xs"
                          >
                            {
                              accessLevelOptions.find(
                                (opt) => opt.value === share.accessLevel
                              )?.label
                            }
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={share.accessLevel}
                            onChange={(value) =>
                              handleUpdateUserAccess(
                                share.email,
                                value as "view" | "download" | "edit"
                              )
                            }
                            options={accessLevelOptions}
                            placeholder="Access level"
                            className="w-40"
                          />
                          <Button
                            variant="error"
                            size="sm"
                            onClick={() => handleRemoveUser(share.email)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expiry Settings */}
              <div className="relative">
                <SwitchButton
                  checked={userHasExpiry}
                  onChange={setUserHasExpiry}
                  className="absolute top-0.25 left-40"
                />
                <div className="flex items-center gap-2 pr-12">
                  <NumberInput
                    min={1}
                    value={userHasExpiry ? userExpiresInDays : ""}
                    onChange={setUserExpiresInDays}
                    disabled={!userHasExpiry}
                    placeholder={userHasExpiry ? "" : "No expiration"}
                    className="flex-1"
                    label="Access expires in (days)"
                  />
                </div>
              </div>
            </div>

            {/* Footer buttons for Share with Users tab */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={userShareMutation.isPending}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleShareWithUsers}
                disabled={
                  userShares.length === 0 || userShareMutation.isPending
                }
              >
                {userShareMutation.isPending ? (
                  <LoadingSpinner />
                ) : (
                  `Share with ${userShares.length} Users`
                )}
              </Button>
            </div>
          </Tab.Content>
        </Tab>
      </Modal.Content>
    </Modal>
  );
};

export default ShareModal;
