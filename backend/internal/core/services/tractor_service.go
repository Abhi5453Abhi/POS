package services

import (
	"errors"
	"time"

	"tractor-agency/internal/adapters/repository"
	"tractor-agency/internal/core/models"
)

var (
	ErrTractorNotFound = errors.New("tractor not found")
	ErrAlreadySold     = errors.New("tractor already sold")
	ErrInvalidData     = errors.New("invalid data provided")
)

// TractorService handles tractor business logic
type TractorService struct {
	tractorRepo     repository.TractorRepository
	transactionRepo repository.TransactionRepository
}

// NewTractorService creates a new tractor service
func NewTractorService(tr repository.TractorRepository, txRepo repository.TransactionRepository) *TractorService {
	return &TractorService{
		tractorRepo:     tr,
		transactionRepo: txRepo,
	}
}

// AddTractor adds a new tractor to inventory (purchase)
func (s *TractorService) AddTractor(tractor *models.Tractor) error {
	if tractor.Brand == "" || tractor.Model == "" {
		return ErrInvalidData
	}

	tractor.Status = models.StatusInStock
	tractor.PurchaseDate = time.Now().Format("2006-01-02")

	if err := s.tractorRepo.Create(tractor); err != nil {
		return err
	}

	// Record purchase transaction
	tx := &models.Transaction{
		Type:        models.TransactionPurchase,
		EntityType:  "tractor",
		EntityID:    tractor.ID,
		Amount:      tractor.PurchasePrice,
		PartyName:   tractor.SupplierName,
		Date:        tractor.PurchaseDate,
		Description: tractor.Brand + " " + tractor.Model + " purchase",
	}
	return s.transactionRepo.Create(tx)
}

// SellTractorResult contains the result of a sale including profit/loss
type SellTractorResult struct {
	Message      string  `json:"message"`
	ProfitLoss   float64 `json:"profit_loss"`
	ExchangeID   *int64  `json:"exchange_id,omitempty"`
}

// SellTractor marks a tractor as sold
func (s *TractorService) SellTractor(tractorID int64, salePrice float64, customerName string, isExchange bool, exchangeTractor *models.Tractor) (*SellTractorResult, error) {
	tractor, err := s.tractorRepo.GetByID(tractorID)
	if err != nil {
		return nil, ErrTractorNotFound
	}

	if tractor.Status == models.StatusSold {
		return nil, ErrAlreadySold
	}

	tractor.Status = models.StatusSold
	tractor.SalePrice = salePrice
	tractor.CustomerName = customerName
	tractor.SaleDate = time.Now().Format("2006-01-02")

	if err := s.tractorRepo.Update(tractor); err != nil {
		return nil, err
	}

	// Record sale transaction
	tx := &models.Transaction{
		Type:        models.TransactionSale,
		EntityType:  "tractor",
		EntityID:    tractor.ID,
		Amount:      salePrice,
		PartyName:   customerName,
		Date:        tractor.SaleDate,
		Description: tractor.Brand + " " + tractor.Model + " sale",
	}
	if err := s.transactionRepo.Create(tx); err != nil {
		return nil, err
	}

	result := &SellTractorResult{
		Message:    "tractor sold successfully",
		ProfitLoss: salePrice - tractor.PurchasePrice,
	}

	// Handle exchange if applicable
	if isExchange && exchangeTractor != nil {
		// Set exchange tractor as in stock
		exchangeTractor.Status = models.StatusInStock
		exchangeTractor.PurchaseDate = time.Now().Format("2006-01-02")
		// Use customer name as supplier if supplier name is not provided
		if exchangeTractor.SupplierName == "" {
			exchangeTractor.SupplierName = customerName
		}
		
		// Create the exchanged tractor
		if err := s.tractorRepo.Create(exchangeTractor); err != nil {
			return nil, err
		}

		// Update the sold tractor to reference the exchange tractor
		tractor.ExchangeTractorID = &exchangeTractor.ID
		if err := s.tractorRepo.Update(tractor); err != nil {
			return nil, err
		}

		// Record purchase transaction for exchange
		exchangeTx := &models.Transaction{
			Type:        models.TransactionPurchase,
			EntityType:  "tractor",
			EntityID:    exchangeTractor.ID,
			Amount:      exchangeTractor.PurchasePrice,
			PartyName:   customerName,
			Date:        exchangeTractor.PurchaseDate,
			Description: exchangeTractor.Brand + " " + exchangeTractor.Model + " exchange purchase",
		}
		if err := s.transactionRepo.Create(exchangeTx); err != nil {
			return nil, err
		}

		// Calculate profit/loss: (Sale Price - Purchase Price) - Exchange Value
		result.ProfitLoss = salePrice - tractor.PurchasePrice - exchangeTractor.PurchasePrice
		result.ExchangeID = &exchangeTractor.ID
		result.Message = "tractor sold with exchange successfully"
	}

	return result, nil
}

// GetInventory returns tractors in stock
func (s *TractorService) GetInventory() ([]models.Tractor, error) {
	status := models.StatusInStock
	return s.tractorRepo.List(&status)
}

// GetAllTractors returns all tractors
func (s *TractorService) GetAllTractors() ([]models.Tractor, error) {
	return s.tractorRepo.List(nil)
}

// UpdateTractor updates an existing tractor
func (s *TractorService) UpdateTractor(tractor *models.Tractor) error {
	return s.tractorRepo.Update(tractor)
}

// DeleteTractor removes a tractor
func (s *TractorService) DeleteTractor(id int64) error {
	return s.tractorRepo.Delete(id)
}

// GetTractor returns a single tractor by ID
func (s *TractorService) GetTractor(id int64) (*models.Tractor, error) {
	return s.tractorRepo.GetByID(id)
}
