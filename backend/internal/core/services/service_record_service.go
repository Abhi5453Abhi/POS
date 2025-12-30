package services

import (
	"encoding/json"
	"errors"
	"time"

	"tractor-agency/internal/adapters/repository"
	"tractor-agency/internal/core/models"
)

var (
	ErrServiceNotFound = errors.New("service record not found")
)

// ServiceRecordService handles service/repair business logic
type ServiceRecordService struct {
	serviceRepo     repository.ServiceRepository
	partRepo        repository.SparePartRepository
	transactionRepo repository.TransactionRepository
}

// NewServiceRecordService creates a new service record service
func NewServiceRecordService(
	sr repository.ServiceRepository,
	pr repository.SparePartRepository,
	txRepo repository.TransactionRepository,
) *ServiceRecordService {
	return &ServiceRecordService{
		serviceRepo:     sr,
		partRepo:        pr,
		transactionRepo: txRepo,
	}
}

// PartUsage represents a part used in a service
type PartUsage struct {
	PartID    int64   `json:"part_id"`
	Name      string  `json:"name"`
	Quantity  int     `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

// CreateServiceRecord creates a new service record
func (s *ServiceRecordService) CreateServiceRecord(record *models.ServiceRecord) error {
	if record.CustomerName == "" || record.Description == "" {
		return ErrInvalidData
	}

	// Parse parts_used JSON and update stock
	if record.PartsUsed != "" {
		var partsUsed []PartUsage
		if err := json.Unmarshal([]byte(record.PartsUsed), &partsUsed); err == nil {
			// Calculate parts cost from parts used
			calculatedPartsCost := 0.0
			for _, partUsage := range partsUsed {
				calculatedPartsCost += partUsage.UnitPrice * float64(partUsage.Quantity)
				
				// Update stock - reduce quantity
				part, err := s.partRepo.GetByID(partUsage.PartID)
				if err != nil {
					return errors.New("part not found: " + partUsage.Name)
				}
				
				if part.StockQuantity < partUsage.Quantity {
					return errors.New("insufficient stock for part: " + partUsage.Name)
				}
				
				newQuantity := part.StockQuantity - partUsage.Quantity
				if err := s.partRepo.UpdateStock(partUsage.PartID, newQuantity); err != nil {
					return err
				}
			}
			// Use calculated cost if parts_cost is 0 or if we want to override
			if record.PartsCost == 0 || calculatedPartsCost > 0 {
				record.PartsCost = calculatedPartsCost
			}
		}
	}

	record.TotalCost = record.LaborCost + record.PartsCost
	record.Status = "completed"

	if record.ServiceDate == "" {
		record.ServiceDate = time.Now().Format("2006-01-02")
	}

	if err := s.serviceRepo.Create(record); err != nil {
		return err
	}

	// Record service transaction
	tx := &models.Transaction{
		Type:        models.TransactionSale,
		EntityType:  "service",
		EntityID:    record.ID,
		Amount:      record.TotalCost,
		PartyName:   record.CustomerName,
		Date:        record.ServiceDate,
		Description: "Service: " + record.Description,
	}
	return s.transactionRepo.Create(tx)
}

// GetServiceRecords returns service records for a date range
func (s *ServiceRecordService) GetServiceRecords(startDate, endDate string) ([]models.ServiceRecord, error) {
	return s.serviceRepo.List(startDate, endDate)
}

// GetServiceRecord returns a single service record by ID
func (s *ServiceRecordService) GetServiceRecord(id int64) (*models.ServiceRecord, error) {
	return s.serviceRepo.GetByID(id)
}

// UpdateServiceRecord updates an existing service record
func (s *ServiceRecordService) UpdateServiceRecord(record *models.ServiceRecord) error {
	// Parse parts_used JSON and recalculate parts cost
	if record.PartsUsed != "" {
		var partsUsed []PartUsage
		if err := json.Unmarshal([]byte(record.PartsUsed), &partsUsed); err == nil {
			// Calculate parts cost from parts used
			calculatedPartsCost := 0.0
			for _, partUsage := range partsUsed {
				calculatedPartsCost += partUsage.UnitPrice * float64(partUsage.Quantity)
			}
			// Use calculated cost if parts_cost is 0 or if we want to override
			if record.PartsCost == 0 || calculatedPartsCost > 0 {
				record.PartsCost = calculatedPartsCost
			}
		}
	}
	
	record.TotalCost = record.LaborCost + record.PartsCost
	return s.serviceRepo.Update(record)
}

// DeleteServiceRecord removes a service record
func (s *ServiceRecordService) DeleteServiceRecord(id int64) error {
	return s.serviceRepo.Delete(id)
}
