package services

import (
	"errors"
	"strconv"
	"time"

	"tractor-agency/internal/adapters/repository"
	"tractor-agency/internal/core/models"
)

var (
	ErrPartNotFound      = errors.New("spare part not found")
	ErrInsufficientStock = errors.New("insufficient stock")
)

// SparePartService handles spare parts business logic
type SparePartService struct {
	partRepo        repository.SparePartRepository
	transactionRepo repository.TransactionRepository
}

// NewSparePartService creates a new spare part service
func NewSparePartService(pr repository.SparePartRepository, txRepo repository.TransactionRepository) *SparePartService {
	return &SparePartService{
		partRepo:        pr,
		transactionRepo: txRepo,
	}
}

// AddPart adds a new spare part
func (s *SparePartService) AddPart(part *models.SparePart) error {
	if part.Name == "" || part.PartNumber == "" {
		return ErrInvalidData
	}
	return s.partRepo.Create(part)
}

// UpdateStock updates the stock quantity for a part
func (s *SparePartService) UpdateStock(partID int64, quantityChange int) error {
	part, err := s.partRepo.GetByID(partID)
	if err != nil {
		return ErrPartNotFound
	}

	newQuantity := part.StockQuantity + quantityChange
	if newQuantity < 0 {
		return ErrInsufficientStock
	}

	return s.partRepo.UpdateStock(partID, newQuantity)
}

// SellPart records a parts sale
func (s *SparePartService) SellPart(partID int64, quantity int, customerName string) error {
	part, err := s.partRepo.GetByID(partID)
	if err != nil {
		return ErrPartNotFound
	}

	if part.StockQuantity < quantity {
		return ErrInsufficientStock
	}

	// Update stock
	if err := s.partRepo.UpdateStock(partID, part.StockQuantity-quantity); err != nil {
		return err
	}

	// Record transaction
	tx := &models.Transaction{
		Type:        models.TransactionSale,
		EntityType:  "part",
		EntityID:    partID,
		Amount:      part.UnitPrice * float64(quantity),
		PartyName:   customerName,
		Date:        time.Now().Format("2006-01-02"),
		Description: part.Name + " x" + strconv.Itoa(quantity),
	}
	return s.transactionRepo.Create(tx)
}

// GetAllParts returns all spare parts
func (s *SparePartService) GetAllParts() ([]models.SparePart, error) {
	return s.partRepo.List()
}

// GetLowStockParts returns parts below minimum stock level
func (s *SparePartService) GetLowStockParts() ([]models.SparePart, error) {
	return s.partRepo.GetLowStock()
}

// UpdatePart updates an existing spare part
func (s *SparePartService) UpdatePart(part *models.SparePart) error {
	return s.partRepo.Update(part)
}

// DeletePart removes a spare part
func (s *SparePartService) DeletePart(id int64) error {
	return s.partRepo.Delete(id)
}

// GetPart returns a single part by ID
func (s *SparePartService) GetPart(id int64) (*models.SparePart, error) {
	return s.partRepo.GetByID(id)
}
