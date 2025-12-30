package http

import (
	"net/http"

	"tractor-agency/internal/core/models"
	"tractor-agency/internal/middleware"
)

// SetupRoutes configures all API routes
func SetupRoutes(h *Handlers, authMiddleware *middleware.AuthMiddleware) http.Handler {
	mux := http.NewServeMux()

	// Public routes
	mux.HandleFunc("POST /api/login", h.Login)

	// Protected routes - wrap with auth middleware
	protectedMux := http.NewServeMux()

	// User routes
	protectedMux.HandleFunc("GET /api/me", h.GetCurrentUser)

	// Dashboard
	protectedMux.HandleFunc("GET /api/dashboard", h.GetDashboard)

	// Tractor routes
	protectedMux.HandleFunc("GET /api/tractors", h.ListTractors)
	protectedMux.HandleFunc("GET /api/tractors/{id}", h.GetTractor)
	protectedMux.HandleFunc("POST /api/tractors", h.CreateTractor)
	protectedMux.HandleFunc("POST /api/tractors/{id}/sell", h.SellTractor)

	// Spare parts routes
	protectedMux.HandleFunc("GET /api/parts", h.ListParts)
	protectedMux.HandleFunc("POST /api/parts", h.CreatePart)
	protectedMux.HandleFunc("POST /api/parts/{id}/sell", h.SellPart)

	// Service routes
	protectedMux.HandleFunc("GET /api/services", h.ListServices)
	protectedMux.HandleFunc("POST /api/services", h.CreateService)

	// Expense routes (some admin-only)
	protectedMux.HandleFunc("GET /api/expenses", h.ListExpenses)
	protectedMux.HandleFunc("POST /api/expenses", h.CreateExpense)
	protectedMux.HandleFunc("GET /api/expenses/summary", h.GetExpenseSummary)
	protectedMux.HandleFunc("PUT /api/expenses/{id}", h.UpdateExpense)
	protectedMux.HandleFunc("DELETE /api/expenses/{id}", h.DeleteExpense)

	// Tractor Update/Delete
	protectedMux.HandleFunc("PUT /api/tractors/{id}", h.UpdateTractor)
	protectedMux.HandleFunc("DELETE /api/tractors/{id}", h.DeleteTractor)

	// Parts Update/Delete
	protectedMux.HandleFunc("PUT /api/parts/{id}", h.UpdatePart)
	protectedMux.HandleFunc("DELETE /api/parts/{id}", h.DeletePart)

	// Services Update/Delete
	protectedMux.HandleFunc("PUT /api/services/{id}", h.UpdateService)
	protectedMux.HandleFunc("DELETE /api/services/{id}", h.DeleteService)

	// Financial reports - accessible to all authenticated users
	protectedMux.HandleFunc("GET /api/reports/transactions", h.GetTransactions)
	
	// Financial reports - Admin only via RequireRole middleware
	adminOnlyMux := http.NewServeMux()
	adminOnlyMux.HandleFunc("GET /api/reports/profit-loss", h.GetProfitLoss)

	// Apply RequireRole to admin-only routes
	adminHandler := middleware.RequireRole(models.RoleAdmin)(adminOnlyMux)

	// Combine protected routes
	mux.Handle("/api/", authMiddleware.Authenticate(protectedMux))
	mux.Handle("/api/reports/profit-loss", authMiddleware.Authenticate(adminHandler))

	// Apply global middleware
	handler := middleware.CORSMiddleware(middleware.JSONMiddleware(mux))

	return handler
}
