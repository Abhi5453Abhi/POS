package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	httpAdapter "tractor-agency/internal/adapters/http"
	"tractor-agency/internal/adapters/repository"
	"tractor-agency/internal/core/models"
	"tractor-agency/internal/core/services"
	"tractor-agency/internal/middleware"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Get database URL
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Get jwt secret from environment or use default
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key-change-in-production"
	}

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Connect to PostgreSQL
	log.Println("🔌 Connecting to PostgreSQL...")
	pgDB, err := repository.NewPostgresDB(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pgDB.Close()
	log.Println("✅ Connected to PostgreSQL!")

	// Initialize PostgreSQL repositories
	userRepo := repository.NewPostgresUserRepository(pgDB)
	tractorRepo := repository.NewPostgresTractorRepository(pgDB)
	partRepo := repository.NewPostgresSparePartRepository(pgDB)
	serviceRepo := repository.NewPostgresServiceRepository(pgDB)
	expenseRepo := repository.NewPostgresExpenseRepository(pgDB)
	transactionRepo := repository.NewPostgresTransactionRepository(pgDB)

	// Create default admin user if not exists
	createDefaultUsers(userRepo)

	// Initialize services
	authService := services.NewAuthService(userRepo, jwtSecret)
	tractorService := services.NewTractorService(tractorRepo, transactionRepo)
	partService := services.NewSparePartService(partRepo, transactionRepo)
	expenseService := services.NewExpenseService(expenseRepo, transactionRepo)
	serviceRecordService := services.NewServiceRecordService(serviceRepo, partRepo, transactionRepo)

	// Initialize handlers
	handlers := httpAdapter.NewHandlers(
		authService,
		tractorService,
		partService,
		expenseService,
		serviceRecordService,
	)

	// Initialize auth middleware
	authMiddleware := middleware.NewAuthMiddleware(authService)

	// Setup routes
	router := httpAdapter.SetupRoutes(handlers, authMiddleware)

	// Start server
	log.Printf("🚜 Tractor Agency Server starting on port %s", port)
	log.Printf("📌 Default credentials - Username: admin, Password: admin123")
	log.Printf("🔗 API available at http://localhost:%s/api", port)

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func createDefaultUsers(userRepo *repository.PostgresUserRepository) {
	// Check if admin already exists
	_, err := userRepo.GetByUsername("admin")
	if err == nil {
		log.Println("👤 Admin user already exists")
		return
	}

	// Create admin user with hashed password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)

	admin := &models.User{
		Username:     "admin",
		PasswordHash: string(hashedPassword),
		FullName:     "System Administrator",
		Role:         models.RoleAdmin,
	}
	if err := userRepo.Create(admin); err != nil {
		log.Printf("⚠️ Failed to create admin user: %v", err)
	} else {
		log.Println("👤 Created admin user")
	}

	// Create a manager user
	managerPassword, _ := bcrypt.GenerateFromPassword([]byte("manager123"), bcrypt.DefaultCost)
	manager := &models.User{
		Username:     "manager",
		PasswordHash: string(managerPassword),
		FullName:     "Branch Manager",
		Role:         models.RoleManager,
	}
	if err := userRepo.Create(manager); err != nil {
		log.Printf("⚠️ Failed to create manager user: %v", err)
	} else {
		log.Println("👤 Created manager user")
	}
}
