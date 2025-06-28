package handlers

import (
	"net/http"
	"strconv"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

type FavoriteHandler struct {
	favoriteService *services.FavoriteService
}

func NewFavoriteHandler(favoriteService *services.FavoriteService) *FavoriteHandler {
	return &FavoriteHandler{
		favoriteService: favoriteService,
	}
}

// AddToFavorites adds a document to user's favorites
func (h *FavoriteHandler) AddToFavorites(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	favorite, err := h.favoriteService.AddToFavorites(c.Request.Context(), userID, documentID)
	if err != nil {
		if err.Error() == "document not found or access denied" {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		if err.Error() == "document is already in favorites" {
			utils.ErrorResponse(c, http.StatusConflict, "ALREADY_FAVORITED", "Document is already in favorites")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "FAVORITE_FAILED", err.Error())
		return
	}

	data := gin.H{
		"favorite": favorite,
	}
	utils.SuccessResponse(c, http.StatusCreated, data, "Document added to favorites successfully")
}

// RemoveFromFavorites removes a document from user's favorites
func (h *FavoriteHandler) RemoveFromFavorites(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	err = h.favoriteService.RemoveFromFavorites(c.Request.Context(), userID, documentID)
	if err != nil {
		if err.Error() == "document not found in favorites" {
			utils.NotFoundResponse(c, "FAVORITE_NOT_FOUND", "Document not found in favorites")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "UNFAVORITE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Document removed from favorites successfully")
}

// GetUserFavorites gets all favorite documents for the authenticated user
func (h *FavoriteHandler) GetUserFavorites(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	favorites, err := h.favoriteService.GetUserFavorites(c.Request.Context(), userID, page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAVORITES_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, favorites, "Favorite documents retrieved successfully")
}

// IsFavorited checks if a document is favorited by the authenticated user
func (h *FavoriteHandler) IsFavorited(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	isFavorited, err := h.favoriteService.IsFavorited(c.Request.Context(), userID, documentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "CHECK_FAVORITE_FAILED", err.Error())
		return
	}

	data := gin.H{
		"isFavorited": isFavorited,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Favorite status retrieved successfully")
}

// GetFavoriteCount gets the total number of times a document has been favorited
func (h *FavoriteHandler) GetFavoriteCount(c *gin.Context) {
	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	count, err := h.favoriteService.GetFavoriteCount(c.Request.Context(), documentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "GET_FAVORITE_COUNT_FAILED", err.Error())
		return
	}

	data := gin.H{
		"favoriteCount": count,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Favorite count retrieved successfully")
}
