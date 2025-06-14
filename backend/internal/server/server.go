package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/app"
	"github.com/sirupsen/logrus"
)

type Server struct {
	app        *app.App
	httpServer *http.Server
}

func New(app *app.App) *Server {
	return &Server{
		app: app,
	}
}

func (s *Server) Run() {
	s.httpServer = &http.Server{
		Addr:         fmt.Sprintf(":%s", s.app.Config.Server.Port),
		Handler:      s.app.Router.GetEngine(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		logrus.Infof("Server starting on port %s", s.app.Config.Server.Port)
		logrus.Infof("Environment: %s", s.app.Config.Environment)
		logrus.Info("API Documentation available at http://localhost:" + s.app.Config.Server.Port)

		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logrus.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logrus.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := s.httpServer.Shutdown(ctx); err != nil {
		logrus.Error("Server forced to shutdown:", err)
	}

	// Close app resources
	if err := s.app.Close(); err != nil {
		logrus.Error("Failed to close app resources:", err)
	}

	logrus.Info("Server shutdown completed")
}
