package repository

import "tractor-agency/internal/core/models"

// UserRepository interface for user data access
type UserRepository interface {
	GetByID(id int64) (*models.User, error)
	GetByUsername(username string) (*models.User, error)
	Create(user *models.User) error
	Update(user *models.User) error
	List() ([]models.User, error)
}

// TractorRepository interface for tractor data access
type TractorRepository interface {
	GetByID(id int64) (*models.Tractor, error)
	Create(tractor *models.Tractor) error
	Update(tractor *models.Tractor) error
	Delete(id int64) error
	List(status *models.TractorStatus) ([]models.Tractor, error)
	GetByChassisNumber(chassisNum string) (*models.Tractor, error)
}

// SparePartRepository interface for spare part data access
type SparePartRepository interface {
	GetByID(id int64) (*models.SparePart, error)
	Create(part *models.SparePart) error
	Update(part *models.SparePart) error
	Delete(id int64) error
	List() ([]models.SparePart, error)
	GetLowStock() ([]models.SparePart, error)
	UpdateStock(id int64, quantity int) error
}

// ServiceRepository interface for service records
type ServiceRepository interface {
	GetByID(id int64) (*models.ServiceRecord, error)
	Create(service *models.ServiceRecord) error
	Update(service *models.ServiceRecord) error
	Delete(id int64) error
	List(startDate, endDate string) ([]models.ServiceRecord, error)
}

// ExpenseRepository interface for expense data access
type ExpenseRepository interface {
	GetByID(id int64) (*models.Expense, error)
	Create(expense *models.Expense) error
	Update(expense *models.Expense) error
	Delete(id int64) error
	List(category *models.ExpenseCategory, startDate, endDate string) ([]models.Expense, error)
	GetTotalByCategory(category models.ExpenseCategory, startDate, endDate string) (float64, error)
}

// TransactionRepository interface for transactions
type TransactionRepository interface {
	Create(transaction *models.Transaction) error
	List(txType *models.TransactionType, startDate, endDate string) ([]models.Transaction, error)
	GetTotalByType(txType models.TransactionType, startDate, endDate string) (float64, error)
}
