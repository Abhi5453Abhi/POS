package http

import (
	"encoding/json"
	"net/http"
	"strconv"

	"tractor-agency/internal/core/models"
	"tractor-agency/internal/core/services"
	"tractor-agency/internal/middleware"
)

// Handlers holds all HTTP handlers
type Handlers struct {
	authService          *services.AuthService
	tractorService       *services.TractorService
	partService          *services.SparePartService
	expenseService       *services.ExpenseService
	serviceRecordService *services.ServiceRecordService
}

// NewHandlers creates new handlers
func NewHandlers(
	auth *services.AuthService,
	tractor *services.TractorService,
	part *services.SparePartService,
	expense *services.ExpenseService,
	serviceRecord *services.ServiceRecordService,
) *Handlers {
	return &Handlers{
		authService:          auth,
		tractorService:       tractor,
		partService:          part,
		expenseService:       expense,
		serviceRecordService: serviceRecord,
	}
}

// respond writes JSON response
func respond(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

// respondError writes error response
func respondError(w http.ResponseWriter, status int, message string) {
	respond(w, status, map[string]string{"error": message})
}

// ========== Auth Handlers ==========

// Login handles user login
func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req services.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.authService.Login(&req)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respond(w, http.StatusOK, resp)
}

// GetCurrentUser returns the current authenticated user
func (h *Handlers) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.authService.GetUser(claims.UserID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	respond(w, http.StatusOK, user)
}

// ========== Tractor Handlers ==========

// TractorResponse includes exchange tractor details
// Using explicit fields instead of embedding to ensure proper JSON structure
type TractorResponse struct {
	ID                int64                `json:"id"`
	Brand             string               `json:"brand"`
	Model             string               `json:"model"`
	Year              int                  `json:"year"`
	Type              models.TractorType   `json:"type"`
	ChassisNumber     string               `json:"chassis_number"`
	EngineNumber      string               `json:"engine_number"`
	PurchasePrice     float64              `json:"purchase_price"`
	SalePrice         float64              `json:"sale_price,omitempty"`
	Status            models.TractorStatus `json:"status"`
	SupplierName      string               `json:"supplier_name"`
	PurchaseDate      string               `json:"purchase_date"`
	SaleDate          string               `json:"sale_date,omitempty"`
	CustomerName      string               `json:"customer_name,omitempty"`
	Notes             string               `json:"notes,omitempty"`
	ExchangeTractorID *int64               `json:"exchange_tractor_id,omitempty"`
	ExchangeTractor   *models.Tractor      `json:"exchange_tractor,omitempty"`
}

// ListTractors returns all tractors or filtered by status
func (h *Handlers) ListTractors(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	var tractors []models.Tractor
	var err error

	if status == "in_stock" {
		tractors, err = h.tractorService.GetInventory()
	} else {
		tractors, err = h.tractorService.GetAllTractors()
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Enrich tractors with exchange tractor details
	responses := make([]TractorResponse, len(tractors))
	for i := range tractors {
		responses[i] = TractorResponse{
			ID:                tractors[i].ID,
			Brand:             tractors[i].Brand,
			Model:             tractors[i].Model,
			Year:              tractors[i].Year,
			Type:              tractors[i].Type,
			ChassisNumber:     tractors[i].ChassisNumber,
			EngineNumber:      tractors[i].EngineNumber,
			PurchasePrice:     tractors[i].PurchasePrice,
			SalePrice:         tractors[i].SalePrice,
			Status:            tractors[i].Status,
			SupplierName:      tractors[i].SupplierName,
			PurchaseDate:      tractors[i].PurchaseDate,
			SaleDate:          tractors[i].SaleDate,
			CustomerName:      tractors[i].CustomerName,
			Notes:             tractors[i].Notes,
			ExchangeTractorID: tractors[i].ExchangeTractorID,
		}
		if tractors[i].ExchangeTractorID != nil {
			exchangeTractor, err := h.tractorService.GetTractor(*tractors[i].ExchangeTractorID)
			if err == nil {
				responses[i].ExchangeTractor = exchangeTractor
			}
		}
	}

	respond(w, http.StatusOK, responses)
}

// GetTractor returns a single tractor
func (h *Handlers) GetTractor(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid tractor id")
		return
	}

	tractor, err := h.tractorService.GetTractor(id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	// Enrich with exchange tractor details
	response := TractorResponse{
		ID:                tractor.ID,
		Brand:             tractor.Brand,
		Model:             tractor.Model,
		Year:              tractor.Year,
		Type:              tractor.Type,
		ChassisNumber:     tractor.ChassisNumber,
		EngineNumber:      tractor.EngineNumber,
		PurchasePrice:     tractor.PurchasePrice,
		Status:            tractor.Status,
		SupplierName:      tractor.SupplierName,
		PurchaseDate:      tractor.PurchaseDate,
		SaleDate:          tractor.SaleDate,
		CustomerName:      tractor.CustomerName,
		Notes:             tractor.Notes,
		ExchangeTractorID: tractor.ExchangeTractorID,
	}
	response.SalePrice = tractor.SalePrice
	if tractor.ExchangeTractorID != nil {
		exchangeTractor, err := h.tractorService.GetTractor(*tractor.ExchangeTractorID)
		if err == nil {
			response.ExchangeTractor = exchangeTractor
		}
	}

	respond(w, http.StatusOK, response)
}

// CreateTractor adds a new tractor
func (h *Handlers) CreateTractor(w http.ResponseWriter, r *http.Request) {
	var tractor models.Tractor
	if err := json.NewDecoder(r.Body).Decode(&tractor); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.tractorService.AddTractor(&tractor); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Return enriched response - fetch the created tractor to get all fields
	createdTractor, err := h.tractorService.GetTractor(tractor.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	response := TractorResponse{
		ID:                createdTractor.ID,
		Brand:             createdTractor.Brand,
		Model:             createdTractor.Model,
		Year:              createdTractor.Year,
		Type:              createdTractor.Type,
		ChassisNumber:     createdTractor.ChassisNumber,
		EngineNumber:      createdTractor.EngineNumber,
		PurchasePrice:     createdTractor.PurchasePrice,
		Status:            createdTractor.Status,
		SupplierName:      createdTractor.SupplierName,
		PurchaseDate:      createdTractor.PurchaseDate,
		SaleDate:          createdTractor.SaleDate,
		CustomerName:      createdTractor.CustomerName,
		Notes:             createdTractor.Notes,
		ExchangeTractorID: createdTractor.ExchangeTractorID,
	}
	response.SalePrice = createdTractor.SalePrice
	if createdTractor.ExchangeTractorID != nil {
		exchangeTractor, err := h.tractorService.GetTractor(*createdTractor.ExchangeTractorID)
		if err == nil {
			response.ExchangeTractor = exchangeTractor
		}
	}

	respond(w, http.StatusCreated, response)
}

// SellTractorRequest represents a sell request
type SellTractorRequest struct {
	SalePrice       float64         `json:"sale_price"`
	CustomerName    string          `json:"customer_name"`
	IsExchange      bool            `json:"is_exchange"`
	ExchangeTractor *models.Tractor `json:"exchange_tractor,omitempty"`
}

// SellTractor marks a tractor as sold
func (h *Handlers) SellTractor(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid tractor id")
		return
	}

	var req SellTractorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var exchangeTractor *models.Tractor
	if req.IsExchange && req.ExchangeTractor != nil {
		exchangeTractor = req.ExchangeTractor
	}

	result, err := h.tractorService.SellTractor(id, req.SalePrice, req.CustomerName, req.IsExchange, exchangeTractor)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respond(w, http.StatusOK, result)
}

// ========== Spare Parts Handlers ==========

// ListParts returns all spare parts
func (h *Handlers) ListParts(w http.ResponseWriter, r *http.Request) {
	lowStock := r.URL.Query().Get("low_stock")

	var parts []models.SparePart
	var err error

	if lowStock == "true" {
		parts, err = h.partService.GetLowStockParts()
	} else {
		parts, err = h.partService.GetAllParts()
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, parts)
}

// CreatePart adds a new spare part
func (h *Handlers) CreatePart(w http.ResponseWriter, r *http.Request) {
	var part models.SparePart
	if err := json.NewDecoder(r.Body).Decode(&part); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.partService.AddPart(&part); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respond(w, http.StatusCreated, part)
}

// SellPartRequest represents a parts sale request
type SellPartRequest struct {
	Quantity     int    `json:"quantity"`
	CustomerName string `json:"customer_name"`
}

// SellPart sells a spare part
func (h *Handlers) SellPart(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid part id")
		return
	}

	var req SellPartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.partService.SellPart(id, req.Quantity, req.CustomerName); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "part sold successfully"})
}

// ========== Service Record Handlers ==========

// ListServices returns service records
func (h *Handlers) ListServices(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	services, err := h.serviceRecordService.GetServiceRecords(startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, services)
}

// CreateService creates a new service record
func (h *Handlers) CreateService(w http.ResponseWriter, r *http.Request) {
	var record models.ServiceRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.serviceRecordService.CreateServiceRecord(&record); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respond(w, http.StatusCreated, record)
}

// ========== Expense Handlers ==========

// ListExpenses returns expenses
func (h *Handlers) ListExpenses(w http.ResponseWriter, r *http.Request) {
	categoryStr := r.URL.Query().Get("category")
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	var category *models.ExpenseCategory
	if categoryStr != "" {
		cat := models.ExpenseCategory(categoryStr)
		category = &cat
	}

	expenses, err := h.expenseService.GetExpenses(category, startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, expenses)
}

// CreateExpense creates a new expense
func (h *Handlers) CreateExpense(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserFromContext(r.Context())
	if claims == nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var expense models.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.expenseService.AddExpense(&expense, claims.UserID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respond(w, http.StatusCreated, expense)
}

// GetExpenseSummary returns expense summary by category
func (h *Handlers) GetExpenseSummary(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	summary, err := h.expenseService.GetExpenseSummary(startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, summary)
}

// GetProfitLoss returns profit/loss report
func (h *Handlers) GetProfitLoss(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	report, err := h.expenseService.GetProfitLoss(startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, report)
}

// GetTransactions returns all transactions grouped by entity type
func (h *Handlers) GetTransactions(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")
	entityType := r.URL.Query().Get("entity_type")

	var txType *models.TransactionType
	if r.URL.Query().Get("type") != "" {
		t := models.TransactionType(r.URL.Query().Get("type"))
		txType = &t
	}

	transactions, err := h.expenseService.GetTransactions(txType, entityType, startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, transactions)
}

// ========== Dashboard Handler ==========

// DashboardData represents dashboard summary
type DashboardData struct {
	TractorsInStock int              `json:"tractors_in_stock"`
	LowStockParts   int              `json:"low_stock_parts"`
	RecentExpenses  []models.Expense `json:"recent_expenses"`
	TotalSales      float64          `json:"total_sales"`
	TotalExpenses   float64          `json:"total_expenses"`
}

// GetDashboard returns dashboard data
func (h *Handlers) GetDashboard(w http.ResponseWriter, r *http.Request) {
	// Get tractors in stock
	tractors, _ := h.tractorService.GetInventory()

	// Get low stock parts
	lowStockParts, _ := h.partService.GetLowStockParts()

	// Get recent expenses (last 30 days would be filtered by DB)
	recentExpenses, _ := h.expenseService.GetExpenses(nil, "", "")

	// Limit to 5 recent expenses for dashboard
	if len(recentExpenses) > 5 {
		recentExpenses = recentExpenses[:5]
	}

	dashboard := DashboardData{
		TractorsInStock: len(tractors),
		LowStockParts:   len(lowStockParts),
		RecentExpenses:  recentExpenses,
	}

	respond(w, http.StatusOK, dashboard)
}

// ========== Update & Delete Handlers ==========

// UpdateTractor updates an existing tractor
func (h *Handlers) UpdateTractor(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid tractor id")
		return
	}

	var tractor models.Tractor
	if err := json.NewDecoder(r.Body).Decode(&tractor); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	tractor.ID = id

	if err := h.tractorService.UpdateTractor(&tractor); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Get updated tractor with exchange details
	updatedTractor, err := h.tractorService.GetTractor(id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return enriched response
	response := TractorResponse{
		ID:                updatedTractor.ID,
		Brand:             updatedTractor.Brand,
		Model:             updatedTractor.Model,
		Year:              updatedTractor.Year,
		Type:              updatedTractor.Type,
		ChassisNumber:     updatedTractor.ChassisNumber,
		EngineNumber:      updatedTractor.EngineNumber,
		PurchasePrice:     updatedTractor.PurchasePrice,
		Status:            updatedTractor.Status,
		SupplierName:      updatedTractor.SupplierName,
		PurchaseDate:      updatedTractor.PurchaseDate,
		SaleDate:          updatedTractor.SaleDate,
		CustomerName:      updatedTractor.CustomerName,
		Notes:             updatedTractor.Notes,
		ExchangeTractorID: updatedTractor.ExchangeTractorID,
	}
	response.SalePrice = updatedTractor.SalePrice
	if updatedTractor.ExchangeTractorID != nil {
		exchangeTractor, err := h.tractorService.GetTractor(*updatedTractor.ExchangeTractorID)
		if err == nil {
			response.ExchangeTractor = exchangeTractor
		}
	}

	respond(w, http.StatusOK, response)
}

// DeleteTractor removes a tractor
func (h *Handlers) DeleteTractor(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid tractor id")
		return
	}

	if err := h.tractorService.DeleteTractor(id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "tractor deleted"})
}

// UpdatePart updates an existing part
func (h *Handlers) UpdatePart(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid part id")
		return
	}

	var part models.SparePart
	if err := json.NewDecoder(r.Body).Decode(&part); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	part.ID = id

	if err := h.partService.UpdatePart(&part); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, part)
}

// DeletePart removes a part
func (h *Handlers) DeletePart(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid part id")
		return
	}

	if err := h.partService.DeletePart(id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "part deleted"})
}

// UpdateService updates an existing service record
func (h *Handlers) UpdateService(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid service id")
		return
	}

	var service models.ServiceRecord
	if err := json.NewDecoder(r.Body).Decode(&service); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	service.ID = id

	if err := h.serviceRecordService.UpdateServiceRecord(&service); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, service)
}

// DeleteService removes a service record
func (h *Handlers) DeleteService(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid service id")
		return
	}

	if err := h.serviceRecordService.DeleteServiceRecord(id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "service deleted"})
}

// UpdateExpense updates an existing expense
func (h *Handlers) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid expense id")
		return
	}

	var expense models.Expense
	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	expense.ID = id

	if err := h.expenseService.UpdateExpense(&expense); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, expense)
}

// DeleteExpense removes an expense
func (h *Handlers) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid expense id")
		return
	}

	if err := h.expenseService.DeleteExpense(id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respond(w, http.StatusOK, map[string]string{"message": "expense deleted"})
}
