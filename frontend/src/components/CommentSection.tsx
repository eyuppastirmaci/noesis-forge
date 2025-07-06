"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { commentService } from "@/services/comment.service";
import {
  CommentResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentListRequest,
  CommentPosition,
  CommentType,
  COMMENT_QUERY_KEYS,
  COMMENT_MUTATION_KEYS,
  ID,
} from "@/types";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import Badge from "@/components/ui/Badge";
import Tab from "@/components/ui/Tab";
import { formatDistanceToNow } from "@/utils/dateUtils";
import { useDispatch } from "react-redux";
import { addToast } from "@/store/slices/toastSlice";
import { cn } from "@/lib/cn";
import {
  Edit,
  Trash2,
  Check,
  RotateCcw,
  Reply,
  MessageSquare,
  FileText,
} from "lucide-react";

interface CommentSectionProps {
  documentId: ID;
  className?: string;
  allowAnnotations?: boolean;
  showResolved?: boolean;
  enableResolvedToggle?: boolean;
  onCommentCount?: (count: number) => void;
  currentUserId?: ID;
  pendingAnnotation?: CommentPosition | null;
  onAnnotationUsed?: () => void;
  onAnnotationClick?: (annotation: CommentResponse) => void;
}

interface CommentItemProps {
  comment: CommentResponse;
  documentId: ID;
  currentUserId?: ID;
  onReply: (commentId: ID) => void;
  onEdit: (comment: CommentResponse) => void;
  onDelete: (commentId: ID) => void;
  onDeleteAnnotation?: (annotation: CommentResponse) => void;
  onResolve: (commentId: ID) => void;
  onUnresolve: (commentId: ID) => void;
  onAnnotationClick?: (annotation: CommentResponse) => void;
  level?: number;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  documentId,
  className,
  allowAnnotations = true,
  showResolved = true,
  enableResolvedToggle = false,
  onCommentCount,
  currentUserId,
  pendingAnnotation,
  onAnnotationUsed,
  onAnnotationClick,
}) => {
  const [newCommentContent, setNewCommentContent] = useState("");
  const [commentType, setCommentType] = useState<CommentType>('general');
  const [annotationPosition, setAnnotationPosition] = useState<
    CommentPosition | undefined
  >();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ID | null>(null);
  const [editingComment, setEditingComment] = useState<CommentResponse | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<ID | null>(null);
  const [deleteConfirmAnnotation, setDeleteConfirmAnnotation] = useState<CommentResponse | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CommentListRequest>({
    page: 1,
    limit: 20,
    resolved: showResolved ? undefined : false,
  });
  // Remove separate filter state, use commentType for both filtering and creation

  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tab labels
  const tabs = [
    { value: 'general', label: 'Comments' },
    { value: 'annotation', label: 'Annotations' },
  ];

  const showToast = (message: string, type: "success" | "error" | "info") => {
    dispatch(addToast({ message, type }));
  };

  // Fetch comments
  const {
    data: commentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
    queryFn: () => commentService.getDocumentComments(documentId, filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const comments = commentsData?.data?.comments || [];
  const totalComments = commentsData?.data?.total || 0;
  const hasNextPage = commentsData?.data?.hasNext || false;

  // Filter comments based on type filter
  const filteredComments = comments.filter(comment => {
    return comment.commentType === commentType;
  });

  const generalCount = comments.filter(c => c.commentType === 'general').length;
  const annotationCount = comments.filter(c => c.commentType === 'annotation').length;

  // Update comment count when comments change
  useEffect(() => {
    onCommentCount?.(totalComments);
  }, [totalComments, onCommentCount]);

  // Handle pending annotation
  useEffect(() => {
    if (pendingAnnotation && !replyingTo) {
      setCommentType("annotation");
      setAnnotationPosition(pendingAnnotation);
      // Focus the textarea for user convenience
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [pendingAnnotation, replyingTo]);

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationKey: COMMENT_MUTATION_KEYS.CREATE,
    mutationFn: (request: CreateCommentRequest) =>
      commentService.createComment(documentId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      setNewCommentContent("");
      setCommentType("general");
      setAnnotationPosition(undefined);
      setReplyingTo(null);
      
      // Clear pending annotation if it was used
      if (annotationPosition && onAnnotationUsed) {
        onAnnotationUsed();
      }
      
      showToast("Comment added successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to add comment", "error");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationKey: COMMENT_MUTATION_KEYS.UPDATE,
    mutationFn: ({
      commentId,
      request,
    }: {
      commentId: ID;
      request: UpdateCommentRequest;
    }) => commentService.updateComment(commentId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      setEditingComment(null);
      showToast("Comment updated successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to update comment", "error");
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationKey: COMMENT_MUTATION_KEYS.DELETE,
    mutationFn: (commentId: ID) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      setDeleteConfirmId(null);
      showToast("Comment deleted successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to delete comment", "error");
    },
  });

  // Resolve comment mutation
  const resolveCommentMutation = useMutation({
    mutationKey: COMMENT_MUTATION_KEYS.RESOLVE,
    mutationFn: (commentId: ID) => commentService.resolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      showToast("Comment resolved successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to resolve comment", "error");
    },
  });

  // Unresolve comment mutation
  const unresolveCommentMutation = useMutation({
    mutationKey: COMMENT_MUTATION_KEYS.UNRESOLVE,
    mutationFn: (commentId: ID) => commentService.unresolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMENT_QUERY_KEYS.DOCUMENT_COMMENTS(documentId),
      });
      showToast("Comment unresolved successfully", "success");
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to unresolve comment", "error");
    },
  });

  // Handle submit new comment
  const handleSubmitComment = async () => {
    if (!newCommentContent.trim()) {
      showToast("Comment content cannot be empty", "error");
      return;
    }

    const validation = commentService.validateComment(newCommentContent);
    if (!validation.isValid) {
      showToast(validation.errors[0], "error");
      return;
    }

    setIsSubmitting(true);

    const request: CreateCommentRequest = {
      content: newCommentContent.trim(),
      commentType: commentType,
      position: annotationPosition,
      parentCommentID: replyingTo || undefined,
    };

    createCommentMutation.mutate(request);
  };

  // Handle edit comment
  const handleEditComment = (comment: CommentResponse) => {
    setEditingComment(comment);
  };

  // Handle save edited comment
  const handleSaveEdit = async (content: string) => {
    if (!editingComment) return;

    const validation = commentService.validateComment(content);
    if (!validation.isValid) {
      showToast(validation.errors[0], "error");
      return;
    }

    updateCommentMutation.mutate({
      commentId: editingComment.id,
      request: { content: content.trim() },
    });
  };

  // Handle delete comment
  const handleDeleteComment = (commentId: ID) => {
    setDeleteConfirmId(commentId);
  };

  // Handle delete annotation
  const handleDeleteAnnotation = (annotation: CommentResponse) => {
    setDeleteConfirmAnnotation(annotation);
  };

  // Handle confirm delete annotation
  const handleConfirmDeleteAnnotation = () => {
    if (deleteConfirmAnnotation) {
      deleteCommentMutation.mutate(deleteConfirmAnnotation.id);
      setDeleteConfirmAnnotation(null);
    }
  };

  // Handle cancel delete annotation
  const handleCancelDeleteAnnotation = () => {
    setDeleteConfirmAnnotation(null);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteCommentMutation.mutate(deleteConfirmId);
    }
  };

  // Handle reply to comment
  const handleReplyToComment = (commentId: ID) => {
    setReplyingTo(commentId);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // Handle resolve comment
  const handleResolveComment = (commentId: ID) => {
    resolveCommentMutation.mutate(commentId);
  };

  // Handle unresolve comment
  const handleUnresolveComment = (commentId: ID) => {
    unresolveCommentMutation.mutate(commentId);
  };

  // Handle load more comments
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
    setFilters((prev) => ({ ...prev, page: page + 1 }));
  };

  // Filter controls
  const toggleShowResolved = () => {
    const newResolvedFilter = filters.resolved === false ? undefined : false;
    setFilters((prev) => ({ ...prev, resolved: newResolvedFilter, page: 1 }));
    setPage(1);
  };

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-red-600 dark:text-red-400">
          Failed to load comments. Please try again.
        </p>
        <Button onClick={() => refetch()} className="mt-2" variant="secondary">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {enableResolvedToggle && (
          <Button
            onClick={toggleShowResolved}
            variant={filters.resolved === false ? "primary" : "secondary"}
            size="sm"
          >
            {filters.resolved === false ? "Show All" : "Hide Resolved"}
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <Tab
        defaultTab={commentType}
        onTabChange={(val) => setCommentType(val as CommentType)}
        className="mt-2"
      >
        <Tab.List>
          <Tab.Title value="general">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Comments ({generalCount})
            </span>
          </Tab.Title>
          <Tab.Title value="annotation">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Annotations ({annotationCount})
            </span>
          </Tab.Title>
        </Tab.List>
      </Tab>

      {/* New Comment Form */}
      {!(commentType === 'annotation' && !annotationPosition && !replyingTo) && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {replyingTo && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              <span className="text-sm text-blue-600 dark:text-blue-400">
                Replying to comment
              </span>
              <Button
                onClick={() => setReplyingTo(null)}
                variant="ghost"
                size="sm"
                className="text-blue-600 dark:text-blue-400"
              >
                Cancel
              </Button>
            </div>
          )}

          {pendingAnnotation && !replyingTo && (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  Adding annotation at position: Page {pendingAnnotation.page || 1}, {Math.round((pendingAnnotation.x || 0) * 100)}%, {Math.round((pendingAnnotation.y || 0) * 100)}%
                </span>
              </div>
              <Button
                onClick={() => {
                  setCommentType("general");
                  setAnnotationPosition(undefined);
                  onAnnotationUsed?.();
                }}
                variant="ghost"
                size="sm"
                className="text-green-600 dark:text-green-400"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Comment type is now handled by the main Type dropdown above */}

          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder={
                replyingTo
                  ? "Write a reply..."
                  : pendingAnnotation
                  ? "Write your annotation comment..."
                  : commentType === 'annotation'
                  ? "Add an annotation..."
                  : "Add a comment..."
              }
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {newCommentContent.length}/5000 characters
              </span>

              <div className="flex items-center space-x-2">
                {replyingTo && (
                  <Button
                    onClick={() => setReplyingTo(null)}
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newCommentContent.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Adding...
                    </>
                  ) : replyingTo ? (
                    "Reply"
                  ) : (
                    "Add Comment"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-2 text-gray-400" />
            <p>
              {commentType === 'general' 
                ? 'No comments yet. Be the first to comment!'
                : 'No annotations found.'
              }
            </p>
          </div>
        ) : (
          <>
            {filteredComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                documentId={documentId}
                currentUserId={currentUserId}
                onReply={handleReplyToComment}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onDeleteAnnotation={handleDeleteAnnotation}
                onResolve={handleResolveComment}
                onUnresolve={handleUnresolveComment}
                onAnnotationClick={onAnnotationClick}
              />
            ))}

            {hasNextPage && (
              <div className="text-center py-4">
                <Button onClick={handleLoadMore} variant="secondary">
                  Load More Comments
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Comment Modal */}
      {editingComment && (
        <EditCommentModal
          comment={editingComment}
          onSave={handleSaveEdit}
          onCancel={() => setEditingComment(null)}
          isLoading={updateCommentMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleteCommentMutation.isPending}
      />

      {/* Delete Annotation Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmAnnotation !== null}
        onClose={handleCancelDeleteAnnotation}
        onConfirm={handleConfirmDeleteAnnotation}
        title="Delete Annotation"
        message="Are you sure you want to delete this annotation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteCommentMutation.isPending}
      />
    </div>
  );
};

// Comment Item Component
const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  documentId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onDeleteAnnotation,
  onResolve,
  onUnresolve,
  onAnnotationClick,
  level = 0,
}) => {
  const isOwner = currentUserId === comment.userID;
  const canResolve = isOwner; // Add more complex logic as needed
  const maxDepth = 3;

  // Debug log
  if (comment.commentType === "annotation") {
    console.log("Annotation debug:", {
      currentUserId,
      commentUserID: comment.userID,
      isEqual: currentUserId === comment.userID,
      isOwner,
      onDeleteAnnotation: !!onDeleteAnnotation
    });
  }

  return (
    <div
      className={cn(
        "border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800",
        level > 0
          ? "ml-6 border-l-4 border-l-blue-200 dark:border-l-blue-600"
          : "",
        comment.isResolved
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
          : ""
      )}
    >
      {/* Comment Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* User Avatar */}
          <div className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
            backgroundColor: comment.user.avatar ? 'transparent' : `hsl(${(comment.user.username.charCodeAt(0) * 137.508) % 360}, 70%, 45%)`,
          }}>
            {comment.user.avatar ? (
              <Image
                src={comment.user.avatar}
                alt={comment.user.name || comment.user.username}
                fill
                sizes="32px"
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-white select-none">
                {(comment.user.name?.[0] || comment.user.username?.[0] || 'U').toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {comment.user.name || comment.user.username}
              </span>

              {/* Show comment type badge */}
              {comment.commentType === "annotation" ? (
                <div className="flex items-center gap-2">
                  {onAnnotationClick ? (
                    <button
                      onClick={() => onAnnotationClick(comment)}
                      className="inline-flex items-center"
                      title="Go to annotation in PDF"
                    >
                      <Badge color="blue" size="sm" className="hover:bg-blue-600 transition-colors">
                        <FileText className="w-3 h-3 mr-1" />
                        Go to Annotation
                      </Badge>
                    </button>
                  ) : (
                    <Badge color="blue" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      Go to Annotation
                    </Badge>
                  )}
                  {onDeleteAnnotation && (
                    <button
                      onClick={() => onDeleteAnnotation(comment)}
                      className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete annotation"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ) : comment.commentType === "general" ? (
                <Badge color="gray" size="sm">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Comment
                </Badge>
              ) : null}

              {comment.isResolved && (
                <Badge color="green" size="sm">
                  Resolved
                </Badge>
              )}

              {comment.isEdited && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (edited)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <time title={new Date(comment.createdAt).toLocaleString()}>
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </time>

              {/* Only show position info for actual annotations with position data */}
              {comment.commentType === "annotation" && comment.position && (
                <span>
                  •{" "}
                  {comment.position.page
                    ? `Page ${comment.position.page}`
                    : "Annotation"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Comment Actions */}
        <div className="flex items-center space-x-1">
          {!comment.isResolved && canResolve && (
            <Button
              onClick={() => onResolve(comment.id)}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-700"
              title="Resolve comment"
            >
              <Check size={16} />
            </Button>
          )}

          {comment.isResolved && canResolve && (
            <Button
              onClick={() => onUnresolve(comment.id)}
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:text-orange-700"
              title="Unresolve comment"
            >
              <RotateCcw size={16} />
            </Button>
          )}

          {level < maxDepth && (
            <Button
              onClick={() => onReply(comment.id)}
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
            >
              <Reply size={16} className="mr-1" />
              Reply
            </Button>
          )}

          {isOwner && (
            <>
              <Button
                onClick={() => onEdit(comment)}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-700"
              >
                <Edit size={16} className="mr-1" />
                Edit
              </Button>
              <Button
                onClick={() => onDelete(comment.id)}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Comment Content */}
      <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
        <p className="whitespace-pre-wrap">{comment.content}</p>
      </div>

      {/* (Page badge removed for annotations) */}
    </div>
  );
};

// Edit Comment Modal Component
interface EditCommentModalProps {
  comment: CommentResponse;
  onSave: (content: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const EditCommentModal: React.FC<EditCommentModalProps> = ({
  comment,
  onSave,
  onCancel,
  isLoading,
}) => {
  const [editContent, setEditContent] = useState(comment.content);

  const handleSave = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onSave(editContent.trim());
    }
  };

  return (
    <Modal isOpen={true} onClose={onCancel} size="md">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Edit Comment
        </h3>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Edit your comment..."
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {editContent.length}/5000 characters
          </span>

          <div className="flex items-center space-x-2">
            <Button onClick={onCancel} variant="ghost" disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !editContent.trim() ||
                editContent === comment.content ||
                isLoading
              }
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CommentSection;
