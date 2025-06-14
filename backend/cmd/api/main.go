package main

import (
	"log"

	"github.com/eyuppastirmaci/noesis-forge/internal/app"
	"github.com/eyuppastirmaci/noesis-forge/internal/server"
)

func main() {
	// Initialize app
	application, err := app.New()
	if err != nil {
		log.Fatal("Failed to initialize app:", err)
	}
	defer application.Close()

	// Create and run server
	srv := server.New(application)
	srv.Run()
}
