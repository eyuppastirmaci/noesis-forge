"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import NumberInput from "@/components/ui/NumberInput";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SwitchButton from "@/components/ui/SwitchButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentMutations } from "@/services/document.service";
import { toast } from "@/utils";
import { CreateShareRequest } from "@/types";
import { Copy, Check, ExternalLink } from "lucide-react";
import CustomTooltip from "@/components/ui/CustomTooltip";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(7);
  const [maxDownloads, setMaxDownloads] = useState<number | undefined>(10);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [hasExpiry, setHasExpiry] = useState<boolean>(true);
  const [hasDownloadLimit, setHasDownloadLimit] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const shareMutation = useMutation(documentMutations.share());

  const handleCreate = async () => {
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
    window.open(generatedLink, '_blank', 'noopener,noreferrer');
  };

  const reset = () => {
    setGeneratedLink(null);
    setExpiresInDays(7);
    setMaxDownloads(10);
    setHasExpiry(true);
    setHasDownloadLimit(true);
    setIsCopied(false);
  };

  const handleClose = () => {
    if (!shareMutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      closeOnEscape
      closeOnOverlayClick
    >
      <Modal.Header>Share Document</Modal.Header>
      <Modal.Content>
        {generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground-secondary">
                Shared Document Link
              </h3>
              <div className="flex items-center gap-2 p-3 bg-background-secondary rounded-lg border border-border">
                <p className="flex-1 text-lg font-bold text-foreground break-all">
                  {generatedLink}
                </p>
              </div>
              <div className="flex items-center justify-start gap-4 mt-6">
                <button
                  id="open-new-tab-btn"
                  onClick={handleOpenInNewTab}
                  className="flex items-center justify-center w-8 h-8 text-white hover:text-gray-300 transition-colors"
                >
                  <ExternalLink className="w-6 h-6" />
                </button>
                <button
                  id="copy-link-btn"
                  onClick={handleCopy}
                  className="flex items-center justify-center w-8 h-8 text-white hover:text-gray-300 transition-colors"
                >
                  {isCopied ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Copy className="w-6 h-6" />
                  )}
                </button>
                <CustomTooltip anchorSelect="#open-new-tab-btn" place="bottom">
                  Open in new tab
                </CustomTooltip>
                <CustomTooltip anchorSelect="#copy-link-btn" place="bottom">
                  {isCopied ? "Copied!" : "Copy link"}
                </CustomTooltip>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative">
              <SwitchButton
                checked={hasExpiry}
                onChange={setHasExpiry}
                className="absolute top-0.25 left-29"
              />
              <div className="flex items-center gap-2">
                <NumberInput
                  min={1}
                  value={hasExpiry ? expiresInDays : ""}
                  onChange={setExpiresInDays}
                  disabled={!hasExpiry}
                  placeholder={hasExpiry ? "" : "No expire date"}
                  className="flex-1"
                  label="Expires in (days)"
                />
              </div>
            </div>

            {/* Download limit row */}
            <div className="relative">
              <SwitchButton
                checked={hasDownloadLimit}
                onChange={setHasDownloadLimit}
                className="absolute top-0.25 left-28"
              />
              <div className="flex items-center gap-2">
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
      </Modal.Content>
      <Modal.Footer>
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
            onClick={handleCreate}
            disabled={shareMutation.isPending}
          >
            {shareMutation.isPending ? <LoadingSpinner /> : "Generate Link"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ShareModal;
