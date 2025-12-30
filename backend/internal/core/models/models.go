package models

// Role defines user roles in the system
type Role string

const (
	RoleAdmin   Role = "admin"
	RoleManager Role = "manager"
)

// User represents an authenticated user
type User struct {
	ID           int64  `json:"id"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"` // Never expose in JSON
	Role         Role   `json:"role"`
	FullName     string `json:"full_name"`
	CreatedAt    string `json:"created_at"`
}

// TractorStatus represents the current status of a tractor
type TractorStatus string

const (
	StatusInStock TractorStatus = "in_stock"
	StatusSold    TractorStatus = "sold"
)

// TractorType represents new or used tractor
type TractorType string

const (
	TypeNew  TractorType = "new"
	TypeUsed TractorType = "used"
)

// Tractor represents a tractor in inventory
type Tractor struct {
	ID              int64         `json:"id"`
	Brand           string        `json:"brand"`
	Model           string        `json:"model"`
	Year            int           `json:"year"`
	Type            TractorType   `json:"type"`
	ChassisNumber   string        `json:"chassis_number"`
	EngineNumber    string        `json:"engine_number"`
	PurchasePrice   float64       `json:"purchase_price"`
	SalePrice       float64       `json:"sale_price,omitempty"`
	Status          TractorStatus `json:"status"`
	SupplierName    string        `json:"supplier_name"`
	PurchaseDate    string        `json:"purchase_date"`
	SaleDate        string        `json:"sale_date,omitempty"`
	CustomerName    string        `json:"customer_name,omitempty"`
	Notes           string        `json:"notes,omitempty"`
	ExchangeTractorID *int64      `json:"exchange_tractor_id,omitempty"` // ID of tractor received in exchange
}

// SparePart represents a spare part in inventory
type SparePart struct {
	ID            int64   `json:"id"`
	Name          string  `json:"name"`
	PartNumber    string  `json:"part_number"`
	Category      string  `json:"category"`
	StockQuantity int     `json:"stock_quantity"`
	UnitPrice     float64 `json:"unit_price"`
	MinStock      int     `json:"min_stock"` // For low stock alerts
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

// ServiceRecord represents a service performed
type ServiceRecord struct {
	ID           int64   `json:"id"`
	TractorID    *int64  `json:"tractor_id,omitempty"` // Optional, could be external tractor
	CustomerName string  `json:"customer_name"`
	Description  string  `json:"description"`
	LaborCost    float64 `json:"labor_cost"`
	PartsCost    float64 `json:"parts_cost"`
	TotalCost    float64 `json:"total_cost"`
	PartsUsed    string  `json:"parts_used"` // JSON array of parts
	ServiceDate  string  `json:"service_date"`
	Status       string  `json:"status"` // pending, completed
}

// ExpenseCategory defines types of expenses
type ExpenseCategory string

const (
	ExpenseSalary ExpenseCategory = "salary"
	ExpenseRent   ExpenseCategory = "rent"
	ExpenseBill   ExpenseCategory = "bill"
	ExpenseMisc   ExpenseCategory = "misc"
)

// Expense represents an agency expense
type Expense struct {
	ID          int64           `json:"id"`
	Category    ExpenseCategory `json:"category"`
	Amount      float64         `json:"amount"`
	Description string          `json:"description"`
	Recipient   string          `json:"recipient,omitempty"` // For salaries
	Date        string          `json:"date"`
	CreatedBy   int64           `json:"created_by"`
	CreatedAt   string          `json:"created_at"`
}

// TransactionType for sales and purchases
type TransactionType string

const (
	TransactionSale     TransactionType = "sale"
	TransactionPurchase TransactionType = "purchase"
)

// Transaction represents a financial transaction
type Transaction struct {
	ID          int64           `json:"id"`
	Type        TransactionType `json:"type"`
	EntityType  string          `json:"entity_type"` // tractor, part, service
	EntityID    int64           `json:"entity_id"`
	Amount      float64         `json:"amount"`
	PartyName   string          `json:"party_name"` // Customer or Supplier
	Date        string          `json:"date"`
	Description string          `json:"description,omitempty"`
}
