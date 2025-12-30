package services

import (
	"errors"
	"time"

	"tractor-agency/internal/adapters/repository"
	"tractor-agency/internal/core/models"
)

var (
	ErrExpenseNotFound = errors.New("expense not found")
)

// ExpenseService handles expense/accounting business logic
type ExpenseService struct {
	expenseRepo     repository.ExpenseRepository
	transactionRepo repository.TransactionRepository
}

// NewExpenseService creates a new expense service
func NewExpenseService(er repository.ExpenseRepository, txRepo repository.TransactionRepository) *ExpenseService {
	return &ExpenseService{
		expenseRepo:     er,
		transactionRepo: txRepo,
	}
}

// AddExpense records a new expense
func (s *ExpenseService) AddExpense(expense *models.Expense, userID int64) error {
	if expense.Amount <= 0 {
		return ErrInvalidData
	}

	expense.CreatedBy = userID
	expense.CreatedAt = time.Now().Format("2006-01-02 15:04:05")

	if expense.Date == "" {
		expense.Date = time.Now().Format("2006-01-02")
	}

	return s.expenseRepo.Create(expense)
}

// GetExpenses returns expenses filtered by category and date range
func (s *ExpenseService) GetExpenses(category *models.ExpenseCategory, startDate, endDate string) ([]models.Expense, error) {
	return s.expenseRepo.List(category, startDate, endDate)
}

// GetExpense returns a single expense by ID
func (s *ExpenseService) GetExpense(id int64) (*models.Expense, error) {
	return s.expenseRepo.GetByID(id)
}

// DeleteExpense removes an expense
func (s *ExpenseService) DeleteExpense(id int64) error {
	return s.expenseRepo.Delete(id)
}

// UpdateExpense updates an existing expense
func (s *ExpenseService) UpdateExpense(expense *models.Expense) error {
	expense.Date = time.Now().Format("2006-01-02")
	return s.expenseRepo.Update(expense)
}

// GetExpenseSummary returns total expenses by category for a date range
func (s *ExpenseService) GetExpenseSummary(startDate, endDate string) (map[string]float64, error) {
	summary := make(map[string]float64)

	categories := []models.ExpenseCategory{
		models.ExpenseSalary,
		models.ExpenseRent,
		models.ExpenseBill,
		models.ExpenseMisc,
	}

	for _, cat := range categories {
		total, err := s.expenseRepo.GetTotalByCategory(cat, startDate, endDate)
		if err != nil {
			return nil, err
		}
		summary[string(cat)] = total
	}

	return summary, nil
}

// GetProfitLoss calculates profit/loss for a period
func (s *ExpenseService) GetProfitLoss(startDate, endDate string) (map[string]float64, error) {
	result := make(map[string]float64)

	// Get total sales
	totalSales, err := s.transactionRepo.GetTotalByType(models.TransactionSale, startDate, endDate)
	if err != nil {
		return nil, err
	}
	result["total_sales"] = totalSales

	// Get total purchases
	totalPurchases, err := s.transactionRepo.GetTotalByType(models.TransactionPurchase, startDate, endDate)
	if err != nil {
		return nil, err
	}
	result["total_purchases"] = totalPurchases

	// Get total expenses
	expenses, err := s.GetExpenseSummary(startDate, endDate)
	if err != nil {
		return nil, err
	}

	var totalExpenses float64
	for _, v := range expenses {
		totalExpenses += v
	}
	result["total_expenses"] = totalExpenses

	// Calculate profit/loss
	result["gross_profit"] = totalSales - totalPurchases
	result["net_profit"] = totalSales - totalPurchases - totalExpenses

	return result, nil
}

// GetTransactions returns transactions filtered by type, entity type, and date range
func (s *ExpenseService) GetTransactions(txType *models.TransactionType, entityType, startDate, endDate string) ([]models.Transaction, error) {
	transactions, err := s.transactionRepo.List(txType, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Filter by entity type if provided
	if entityType != "" {
		filtered := make([]models.Transaction, 0)
		for _, tx := range transactions {
			if tx.EntityType == entityType {
				filtered = append(filtered, tx)
			}
		}
		return filtered, nil
	}

	return transactions, nil
}
