package app

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/database"
	"github.com/eyuppastirmaci/noesis-forge/internal/router"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type App struct {
	Config *config.Config
	DB     *gorm.DB
	Router *router.Router
}

func New() (*App, error) {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}

	// Setup logger
	logrus.SetLevel(logrus.InfoLevel)
	if cfg.Environment == "development" {
		logrus.SetLevel(logrus.DebugLevel)
	}

	// Connect database
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		return nil, err
	}

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		return nil, err
	}

	// Seed data
	if err := database.SeedDefaultData(db); err != nil {
		return nil, err
	}

	// Initialize router
	r := router.New(cfg, db)
	r.SetupRoutes(db)

	return &App{
		Config: cfg,
		DB:     db,
		Router: r,
	}, nil
}

func (a *App) Close() error {
	if sqlDB, err := a.DB.DB(); err == nil {
		return sqlDB.Close()
	}
	return nil
}
