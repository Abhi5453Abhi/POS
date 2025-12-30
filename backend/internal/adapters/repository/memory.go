package repository

import (
	"errors"
	"sync"
	"time"

	"tractor-agency/internal/core/models"
)

// MemoryStore provides in-memory implementations of all repositories
// This is a placeholder until real database is configured

var ErrNotFound = errors.New("record not found")

// ========== User Repository ==========

type MemoryUserRepository struct {
	mu     sync.RWMutex
	users  map[int64]*models.User
	nextID int64
}

func NewMemoryUserRepository() *MemoryUserRepository {
	return &MemoryUserRepository{
		users:  make(map[int64]*models.User),
		nextID: 1,
	}
}

func (r *MemoryUserRepository) GetByID(id int64) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if user, ok := r.users[id]; ok {
		return user, nil
	}
	return nil, ErrNotFound
}

func (r *MemoryUserRepository) GetByUsername(username string) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, user := range r.users {
		if user.Username == username {
			return user, nil
		}
	}
	return nil, ErrNotFound
}

func (r *MemoryUserRepository) Create(user *models.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	user.ID = r.nextID
	r.nextID++
	r.users[user.ID] = user
	return nil
}

func (r *MemoryUserRepository) Update(user *models.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[user.ID]; !ok {
		return ErrNotFound
	}
	r.users[user.ID] = user
	return nil
}

func (r *MemoryUserRepository) List() ([]models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]models.User, 0, len(r.users))
	for _, user := range r.users {
		users = append(users, *user)
	}
	return users, nil
}

// ========== Tractor Repository ==========

type MemoryTractorRepository struct {
	mu       sync.RWMutex
	tractors map[int64]*models.Tractor
	nextID   int64
}

func NewMemoryTractorRepository() *MemoryTractorRepository {
	return &MemoryTractorRepository{
		tractors: make(map[int64]*models.Tractor),
		nextID:   1,
	}
}

func (r *MemoryTractorRepository) GetByID(id int64) (*models.Tractor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if tractor, ok := r.tractors[id]; ok {
		return tractor, nil
	}
	return nil, ErrNotFound
}

func (r *MemoryTractorRepository) Create(tractor *models.Tractor) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	tractor.ID = r.nextID
	r.nextID++
	r.tractors[tractor.ID] = tractor
	return nil
}

func (r *MemoryTractorRepository) Update(tractor *models.Tractor) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tractors[tractor.ID]; !ok {
		return ErrNotFound
	}
	r.tractors[tractor.ID] = tractor
	return nil
}

func (r *MemoryTractorRepository) Delete(id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tractors[id]; !ok {
		return ErrNotFound
	}
	delete(r.tractors, id)
	return nil
}

func (r *MemoryTractorRepository) List(status *models.TractorStatus) ([]models.Tractor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tractors := make([]models.Tractor, 0)
	for _, t := range r.tractors {
		if status == nil || t.Status == *status {
			tractors = append(tractors, *t)
		}
	}
	return tractors, nil
}

func (r *MemoryTractorRepository) GetByChassisNumber(chassisNum string) (*models.Tractor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, t := range r.tractors {
		if t.ChassisNumber == chassisNum {
			return t, nil
		}
	}
	return nil, ErrNotFound
}

// ========== Spare Part Repository ==========

type MemorySparePartRepository struct {
	mu     sync.RWMutex
	parts  map[int64]*models.SparePart
	nextID int64
}

func NewMemorySparePartRepository() *MemorySparePartRepository {
	return &MemorySparePartRepository{
		parts:  make(map[int64]*models.SparePart),
		nextID: 1,
	}
}

func (r *MemorySparePartRepository) GetByID(id int64) (*models.SparePart, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if part, ok := r.parts[id]; ok {
		return part, nil
	}
	return nil, ErrNotFound
}

func (r *MemorySparePartRepository) Create(part *models.SparePart) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	part.ID = r.nextID
	r.nextID++
	part.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	part.UpdatedAt = part.CreatedAt
	r.parts[part.ID] = part
	return nil
}

func (r *MemorySparePartRepository) Update(part *models.SparePart) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.parts[part.ID]; !ok {
		return ErrNotFound
	}
	part.UpdatedAt = time.Now().Format("2006-01-02 15:04:05")
	r.parts[part.ID] = part
	return nil
}

func (r *MemorySparePartRepository) Delete(id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.parts[id]; !ok {
		return ErrNotFound
	}
	delete(r.parts, id)
	return nil
}

func (r *MemorySparePartRepository) List() ([]models.SparePart, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	parts := make([]models.SparePart, 0, len(r.parts))
	for _, p := range r.parts {
		parts = append(parts, *p)
	}
	return parts, nil
}

func (r *MemorySparePartRepository) GetLowStock() ([]models.SparePart, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	parts := make([]models.SparePart, 0)
	for _, p := range r.parts {
		if p.StockQuantity <= p.MinStock {
			parts = append(parts, *p)
		}
	}
	return parts, nil
}

func (r *MemorySparePartRepository) UpdateStock(id int64, quantity int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if part, ok := r.parts[id]; ok {
		part.StockQuantity = quantity
		part.UpdatedAt = time.Now().Format("2006-01-02 15:04:05")
		return nil
	}
	return ErrNotFound
}

// ========== Service Repository ==========

type MemoryServiceRepository struct {
	mu       sync.RWMutex
	services map[int64]*models.ServiceRecord
	nextID   int64
}

func NewMemoryServiceRepository() *MemoryServiceRepository {
	return &MemoryServiceRepository{
		services: make(map[int64]*models.ServiceRecord),
		nextID:   1,
	}
}

func (r *MemoryServiceRepository) GetByID(id int64) (*models.ServiceRecord, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if svc, ok := r.services[id]; ok {
		return svc, nil
	}
	return nil, ErrNotFound
}

func (r *MemoryServiceRepository) Create(service *models.ServiceRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	service.ID = r.nextID
	r.nextID++
	r.services[service.ID] = service
	return nil
}

func (r *MemoryServiceRepository) Update(service *models.ServiceRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.services[service.ID]; !ok {
		return ErrNotFound
	}
	r.services[service.ID] = service
	return nil
}

func (r *MemoryServiceRepository) List(startDate, endDate string) ([]models.ServiceRecord, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	services := make([]models.ServiceRecord, 0, len(r.services))
	for _, s := range r.services {
		// Simple date filtering (in real DB this would be SQL WHERE)
		if (startDate == "" || s.ServiceDate >= startDate) &&
			(endDate == "" || s.ServiceDate <= endDate) {
			services = append(services, *s)
		}
	}
	return services, nil
}

// ========== Expense Repository ==========

type MemoryExpenseRepository struct {
	mu       sync.RWMutex
	expenses map[int64]*models.Expense
	nextID   int64
}

func NewMemoryExpenseRepository() *MemoryExpenseRepository {
	return &MemoryExpenseRepository{
		expenses: make(map[int64]*models.Expense),
		nextID:   1,
	}
}

func (r *MemoryExpenseRepository) GetByID(id int64) (*models.Expense, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if exp, ok := r.expenses[id]; ok {
		return exp, nil
	}
	return nil, ErrNotFound
}

func (r *MemoryExpenseRepository) Create(expense *models.Expense) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	expense.ID = r.nextID
	r.nextID++
	r.expenses[expense.ID] = expense
	return nil
}

func (r *MemoryExpenseRepository) Update(expense *models.Expense) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.expenses[expense.ID]; !ok {
		return ErrNotFound
	}
	r.expenses[expense.ID] = expense
	return nil
}

func (r *MemoryExpenseRepository) Delete(id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.expenses[id]; !ok {
		return ErrNotFound
	}
	delete(r.expenses, id)
	return nil
}

func (r *MemoryExpenseRepository) List(category *models.ExpenseCategory, startDate, endDate string) ([]models.Expense, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	expenses := make([]models.Expense, 0)
	for _, e := range r.expenses {
		if (category == nil || e.Category == *category) &&
			(startDate == "" || e.Date >= startDate) &&
			(endDate == "" || e.Date <= endDate) {
			expenses = append(expenses, *e)
		}
	}
	return expenses, nil
}

func (r *MemoryExpenseRepository) GetTotalByCategory(category models.ExpenseCategory, startDate, endDate string) (float64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var total float64
	for _, e := range r.expenses {
		if e.Category == category &&
			(startDate == "" || e.Date >= startDate) &&
			(endDate == "" || e.Date <= endDate) {
			total += e.Amount
		}
	}
	return total, nil
}

// ========== Transaction Repository ==========

type MemoryTransactionRepository struct {
	mu           sync.RWMutex
	transactions map[int64]*models.Transaction
	nextID       int64
}

func NewMemoryTransactionRepository() *MemoryTransactionRepository {
	return &MemoryTransactionRepository{
		transactions: make(map[int64]*models.Transaction),
		nextID:       1,
	}
}

func (r *MemoryTransactionRepository) Create(tx *models.Transaction) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	tx.ID = r.nextID
	r.nextID++
	if tx.Date == "" {
		tx.Date = time.Now().Format("2006-01-02")
	}
	r.transactions[tx.ID] = tx
	return nil
}

func (r *MemoryTransactionRepository) List(txType *models.TransactionType, startDate, endDate string) ([]models.Transaction, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	txs := make([]models.Transaction, 0)
	for _, t := range r.transactions {
		if (txType == nil || t.Type == *txType) &&
			(startDate == "" || t.Date >= startDate) &&
			(endDate == "" || t.Date <= endDate) {
			txs = append(txs, *t)
		}
	}
	return txs, nil
}

func (r *MemoryTransactionRepository) GetTotalByType(txType models.TransactionType, startDate, endDate string) (float64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var total float64
	for _, t := range r.transactions {
		if t.Type == txType &&
			(startDate == "" || t.Date >= startDate) &&
			(endDate == "" || t.Date <= endDate) {
			total += t.Amount
		}
	}
	return total, nil
}
