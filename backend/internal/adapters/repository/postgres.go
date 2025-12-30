package repository

import (
	"database/sql"
	"fmt"
	"time"

	"tractor-agency/internal/core/models"

	_ "github.com/lib/pq"
)

// PostgresDB holds the database connection
type PostgresDB struct {
	DB *sql.DB
}

// NewPostgresDB creates a new PostgreSQL connection
func NewPostgresDB(databaseURL string) (*PostgresDB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	pg := &PostgresDB{DB: db}

	// Create tables
	if err := pg.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	return pg, nil
}

// createTables creates all necessary tables
func (p *PostgresDB) createTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username VARCHAR(255) UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			full_name VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS tractors (
			id SERIAL PRIMARY KEY,
			brand VARCHAR(255) NOT NULL,
			model VARCHAR(255) NOT NULL,
			year INTEGER NOT NULL,
			type VARCHAR(50) NOT NULL,
			chassis_number VARCHAR(255) UNIQUE NOT NULL,
			engine_number VARCHAR(255) NOT NULL,
			purchase_price DECIMAL(15,2) NOT NULL,
			sale_price DECIMAL(15,2),
			status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
			supplier_name VARCHAR(255),
			purchase_date DATE,
			sale_date DATE,
			customer_name VARCHAR(255),
			notes TEXT,
			exchange_tractor_id INTEGER REFERENCES tractors(id)
		)`,
		`ALTER TABLE tractors ADD COLUMN IF NOT EXISTS exchange_tractor_id INTEGER REFERENCES tractors(id)`,
		`CREATE TABLE IF NOT EXISTS spare_parts (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			part_number VARCHAR(255) UNIQUE NOT NULL,
			category VARCHAR(255),
			stock_quantity INTEGER NOT NULL DEFAULT 0,
			unit_price DECIMAL(15,2) NOT NULL,
			min_stock INTEGER DEFAULT 5,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS service_records (
			id SERIAL PRIMARY KEY,
			tractor_id INTEGER REFERENCES tractors(id),
			customer_name VARCHAR(255) NOT NULL,
			description TEXT NOT NULL,
			labor_cost DECIMAL(15,2) DEFAULT 0,
			parts_cost DECIMAL(15,2) DEFAULT 0,
			total_cost DECIMAL(15,2) DEFAULT 0,
			parts_used TEXT,
			service_date DATE NOT NULL,
			status VARCHAR(50) DEFAULT 'completed'
		)`,
		`CREATE TABLE IF NOT EXISTS expenses (
			id SERIAL PRIMARY KEY,
			category VARCHAR(50) NOT NULL,
			amount DECIMAL(15,2) NOT NULL,
			description TEXT NOT NULL,
			recipient VARCHAR(255),
			date DATE NOT NULL,
			created_by INTEGER REFERENCES users(id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id SERIAL PRIMARY KEY,
			type VARCHAR(50) NOT NULL,
			entity_type VARCHAR(50) NOT NULL,
			entity_id INTEGER NOT NULL,
			amount DECIMAL(15,2) NOT NULL,
			party_name VARCHAR(255),
			date DATE NOT NULL,
			description TEXT
		)`,
	}

	for _, query := range queries {
		if _, err := p.DB.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %w", err)
		}
	}

	return nil
}

// Close closes the database connection
func (p *PostgresDB) Close() error {
	return p.DB.Close()
}

// ========== User Repository ==========

type PostgresUserRepository struct {
	db *sql.DB
}

func NewPostgresUserRepository(pg *PostgresDB) *PostgresUserRepository {
	return &PostgresUserRepository{db: pg.DB}
}

func (r *PostgresUserRepository) GetByID(id int64) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(
		"SELECT id, username, password_hash, full_name, role, created_at FROM users WHERE id = $1",
		id,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.FullName, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *PostgresUserRepository) GetByUsername(username string) (*models.User, error) {
	user := &models.User{}
	err := r.db.QueryRow(
		"SELECT id, username, password_hash, full_name, role, created_at FROM users WHERE username = $1",
		username,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.FullName, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *PostgresUserRepository) Create(user *models.User) error {
	return r.db.QueryRow(
		"INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
		user.Username, user.PasswordHash, user.FullName, user.Role,
	).Scan(&user.ID, &user.CreatedAt)
}

func (r *PostgresUserRepository) Update(user *models.User) error {
	_, err := r.db.Exec(
		"UPDATE users SET username = $1, password_hash = $2, full_name = $3, role = $4 WHERE id = $5",
		user.Username, user.PasswordHash, user.FullName, user.Role, user.ID,
	)
	return err
}

func (r *PostgresUserRepository) List() ([]models.User, error) {
	rows, err := r.db.Query("SELECT id, username, password_hash, full_name, role, created_at FROM users ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.FullName, &u.Role, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

// ========== Tractor Repository ==========

type PostgresTractorRepository struct {
	db *sql.DB
}

func NewPostgresTractorRepository(pg *PostgresDB) *PostgresTractorRepository {
	return &PostgresTractorRepository{db: pg.DB}
}

func (r *PostgresTractorRepository) GetByID(id int64) (*models.Tractor, error) {
	t := &models.Tractor{}
	var salePrice, saleDate, customerName, notes sql.NullString
	var exchangeTractorID sql.NullInt64
	err := r.db.QueryRow(`
		SELECT id, brand, model, year, type, chassis_number, engine_number, 
		       purchase_price, sale_price, status, supplier_name, purchase_date, 
		       sale_date, customer_name, notes, exchange_tractor_id
		FROM tractors WHERE id = $1`, id,
	).Scan(&t.ID, &t.Brand, &t.Model, &t.Year, &t.Type, &t.ChassisNumber, &t.EngineNumber,
		&t.PurchasePrice, &salePrice, &t.Status, &t.SupplierName, &t.PurchaseDate,
		&saleDate, &customerName, &notes, &exchangeTractorID)
	if err != nil {
		return nil, err
	}
	if salePrice.Valid {
		fmt.Sscanf(salePrice.String, "%f", &t.SalePrice)
	}
	t.SaleDate = saleDate.String
	t.CustomerName = customerName.String
	t.Notes = notes.String
	if exchangeTractorID.Valid {
		t.ExchangeTractorID = &exchangeTractorID.Int64
	}
	return t, nil
}

func (r *PostgresTractorRepository) Create(tractor *models.Tractor) error {
	return r.db.QueryRow(`
		INSERT INTO tractors (brand, model, year, type, chassis_number, engine_number, 
		                      purchase_price, status, supplier_name, purchase_date, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
		tractor.Brand, tractor.Model, tractor.Year, tractor.Type, tractor.ChassisNumber,
		tractor.EngineNumber, tractor.PurchasePrice, tractor.Status, tractor.SupplierName,
		tractor.PurchaseDate, tractor.Notes,
	).Scan(&tractor.ID)
}

func (r *PostgresTractorRepository) Update(tractor *models.Tractor) error {
	_, err := r.db.Exec(`
		UPDATE tractors SET brand=$1, model=$2, year=$3, type=$4, chassis_number=$5,
		engine_number=$6, purchase_price=$7, sale_price=$8, status=$9, supplier_name=$10,
		purchase_date=$11, sale_date=$12, customer_name=$13, notes=$14, exchange_tractor_id=$15 WHERE id=$16`,
		tractor.Brand, tractor.Model, tractor.Year, tractor.Type, tractor.ChassisNumber,
		tractor.EngineNumber, tractor.PurchasePrice, tractor.SalePrice, tractor.Status,
		tractor.SupplierName, tractor.PurchaseDate, tractor.SaleDate, tractor.CustomerName,
		tractor.Notes, tractor.ExchangeTractorID, tractor.ID,
	)
	return err
}

func (r *PostgresTractorRepository) Delete(id int64) error {
	// First, remove references to this tractor from other tractors (exchange_tractor_id)
	_, err := r.db.Exec("UPDATE tractors SET exchange_tractor_id = NULL WHERE exchange_tractor_id = $1", id)
	if err != nil {
		return err
	}
	
	// Remove references from service_records (set tractor_id to NULL)
	_, err = r.db.Exec("UPDATE service_records SET tractor_id = NULL WHERE tractor_id = $1", id)
	if err != nil {
		return err
	}
	
	// Now delete the tractor
	_, err = r.db.Exec("DELETE FROM tractors WHERE id = $1", id)
	return err
}

func (r *PostgresTractorRepository) List(status *models.TractorStatus) ([]models.Tractor, error) {
	var rows *sql.Rows
	var err error

	if status != nil {
		rows, err = r.db.Query(`
			SELECT id, brand, model, year, type, chassis_number, engine_number,
			       purchase_price, COALESCE(sale_price, 0), status, supplier_name, 
			       purchase_date, COALESCE(sale_date::text, ''), COALESCE(customer_name, ''), 
			       COALESCE(notes, ''), exchange_tractor_id
			FROM tractors WHERE status = $1 ORDER BY id DESC`, *status)
	} else {
		rows, err = r.db.Query(`
			SELECT id, brand, model, year, type, chassis_number, engine_number,
			       purchase_price, COALESCE(sale_price, 0), status, supplier_name, 
			       purchase_date, COALESCE(sale_date::text, ''), COALESCE(customer_name, ''), 
			       COALESCE(notes, ''), exchange_tractor_id
			FROM tractors ORDER BY id DESC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tractors []models.Tractor
	for rows.Next() {
		var t models.Tractor
		var exchangeTractorID sql.NullInt64
		if err := rows.Scan(&t.ID, &t.Brand, &t.Model, &t.Year, &t.Type, &t.ChassisNumber,
			&t.EngineNumber, &t.PurchasePrice, &t.SalePrice, &t.Status, &t.SupplierName,
			&t.PurchaseDate, &t.SaleDate, &t.CustomerName, &t.Notes, &exchangeTractorID); err != nil {
			return nil, err
		}
		if exchangeTractorID.Valid {
			t.ExchangeTractorID = &exchangeTractorID.Int64
		}
		tractors = append(tractors, t)
	}
	return tractors, nil
}

func (r *PostgresTractorRepository) GetByChassisNumber(chassisNum string) (*models.Tractor, error) {
	t := &models.Tractor{}
	err := r.db.QueryRow("SELECT id FROM tractors WHERE chassis_number = $1", chassisNum).Scan(&t.ID)
	if err != nil {
		return nil, err
	}
	return r.GetByID(t.ID)
}

// ========== Spare Part Repository ==========

type PostgresSparePartRepository struct {
	db *sql.DB
}

func NewPostgresSparePartRepository(pg *PostgresDB) *PostgresSparePartRepository {
	return &PostgresSparePartRepository{db: pg.DB}
}

func (r *PostgresSparePartRepository) GetByID(id int64) (*models.SparePart, error) {
	p := &models.SparePart{}
	err := r.db.QueryRow(`
		SELECT id, name, part_number, COALESCE(category, ''), stock_quantity, unit_price, min_stock, created_at, updated_at
		FROM spare_parts WHERE id = $1`, id,
	).Scan(&p.ID, &p.Name, &p.PartNumber, &p.Category, &p.StockQuantity, &p.UnitPrice, &p.MinStock, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *PostgresSparePartRepository) Create(part *models.SparePart) error {
	return r.db.QueryRow(`
		INSERT INTO spare_parts (name, part_number, category, stock_quantity, unit_price, min_stock)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`,
		part.Name, part.PartNumber, part.Category, part.StockQuantity, part.UnitPrice, part.MinStock,
	).Scan(&part.ID, &part.CreatedAt, &part.UpdatedAt)
}

func (r *PostgresSparePartRepository) Update(part *models.SparePart) error {
	_, err := r.db.Exec(`
		UPDATE spare_parts SET name=$1, part_number=$2, category=$3, stock_quantity=$4, 
		unit_price=$5, min_stock=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7`,
		part.Name, part.PartNumber, part.Category, part.StockQuantity, part.UnitPrice, part.MinStock, part.ID,
	)
	return err
}

func (r *PostgresSparePartRepository) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM spare_parts WHERE id = $1", id)
	return err
}

func (r *PostgresSparePartRepository) List() ([]models.SparePart, error) {
	rows, err := r.db.Query(`
		SELECT id, name, part_number, COALESCE(category, ''), stock_quantity, unit_price, min_stock, created_at, updated_at
		FROM spare_parts ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var parts []models.SparePart
	for rows.Next() {
		var p models.SparePart
		if err := rows.Scan(&p.ID, &p.Name, &p.PartNumber, &p.Category, &p.StockQuantity, &p.UnitPrice, &p.MinStock, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		parts = append(parts, p)
	}
	return parts, nil
}

func (r *PostgresSparePartRepository) GetLowStock() ([]models.SparePart, error) {
	rows, err := r.db.Query(`
		SELECT id, name, part_number, COALESCE(category, ''), stock_quantity, unit_price, min_stock, created_at, updated_at
		FROM spare_parts WHERE stock_quantity <= min_stock ORDER BY stock_quantity`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var parts []models.SparePart
	for rows.Next() {
		var p models.SparePart
		if err := rows.Scan(&p.ID, &p.Name, &p.PartNumber, &p.Category, &p.StockQuantity, &p.UnitPrice, &p.MinStock, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		parts = append(parts, p)
	}
	return parts, nil
}

func (r *PostgresSparePartRepository) UpdateStock(id int64, quantity int) error {
	_, err := r.db.Exec("UPDATE spare_parts SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", quantity, id)
	return err
}

// ========== Service Repository ==========

type PostgresServiceRepository struct {
	db *sql.DB
}

func NewPostgresServiceRepository(pg *PostgresDB) *PostgresServiceRepository {
	return &PostgresServiceRepository{db: pg.DB}
}

func (r *PostgresServiceRepository) GetByID(id int64) (*models.ServiceRecord, error) {
	s := &models.ServiceRecord{}
	var tractorID sql.NullInt64
	err := r.db.QueryRow(`
		SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
		       COALESCE(parts_used, ''), service_date, status
		FROM service_records WHERE id = $1`, id,
	).Scan(&s.ID, &tractorID, &s.CustomerName, &s.Description, &s.LaborCost, &s.PartsCost,
		&s.TotalCost, &s.PartsUsed, &s.ServiceDate, &s.Status)
	if tractorID.Valid {
		s.TractorID = &tractorID.Int64
	}
	return s, err
}

func (r *PostgresServiceRepository) Create(service *models.ServiceRecord) error {
	return r.db.QueryRow(`
		INSERT INTO service_records (tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, parts_used, service_date, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		service.TractorID, service.CustomerName, service.Description, service.LaborCost,
		service.PartsCost, service.TotalCost, service.PartsUsed, service.ServiceDate, service.Status,
	).Scan(&service.ID)
}

func (r *PostgresServiceRepository) Update(service *models.ServiceRecord) error {
	_, err := r.db.Exec(`
		UPDATE service_records SET tractor_id=$1, customer_name=$2, description=$3, labor_cost=$4,
		parts_cost=$5, total_cost=$6, parts_used=$7, service_date=$8, status=$9 WHERE id=$10`,
		service.TractorID, service.CustomerName, service.Description, service.LaborCost,
		service.PartsCost, service.TotalCost, service.PartsUsed, service.ServiceDate, service.Status, service.ID,
	)
	return err
}

func (r *PostgresServiceRepository) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM service_records WHERE id = $1", id)
	return err
}

func (r *PostgresServiceRepository) List(startDate, endDate string) ([]models.ServiceRecord, error) {
	query := `SELECT id, tractor_id, customer_name, description, labor_cost, parts_cost, total_cost, 
	          COALESCE(parts_used, ''), service_date, status FROM service_records WHERE 1=1`
	var args []interface{}
	argNum := 1

	if startDate != "" {
		query += fmt.Sprintf(" AND service_date >= $%d", argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND service_date <= $%d", argNum)
		args = append(args, endDate)
	}
	query += " ORDER BY service_date DESC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.ServiceRecord
	for rows.Next() {
		var s models.ServiceRecord
		var tractorID sql.NullInt64
		if err := rows.Scan(&s.ID, &tractorID, &s.CustomerName, &s.Description, &s.LaborCost,
			&s.PartsCost, &s.TotalCost, &s.PartsUsed, &s.ServiceDate, &s.Status); err != nil {
			return nil, err
		}
		if tractorID.Valid {
			s.TractorID = &tractorID.Int64
		}
		services = append(services, s)
	}
	return services, nil
}

// ========== Expense Repository ==========

type PostgresExpenseRepository struct {
	db *sql.DB
}

func NewPostgresExpenseRepository(pg *PostgresDB) *PostgresExpenseRepository {
	return &PostgresExpenseRepository{db: pg.DB}
}

func (r *PostgresExpenseRepository) GetByID(id int64) (*models.Expense, error) {
	e := &models.Expense{}
	var recipient sql.NullString
	err := r.db.QueryRow(`
		SELECT id, category, amount, description, recipient, date, created_by, created_at
		FROM expenses WHERE id = $1`, id,
	).Scan(&e.ID, &e.Category, &e.Amount, &e.Description, &recipient, &e.Date, &e.CreatedBy, &e.CreatedAt)
	e.Recipient = recipient.String
	return e, err
}

func (r *PostgresExpenseRepository) Create(expense *models.Expense) error {
	return r.db.QueryRow(`
		INSERT INTO expenses (category, amount, description, recipient, date, created_by)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		expense.Category, expense.Amount, expense.Description, expense.Recipient, expense.Date, expense.CreatedBy,
	).Scan(&expense.ID, &expense.CreatedAt)
}

func (r *PostgresExpenseRepository) Update(expense *models.Expense) error {
	_, err := r.db.Exec(`
		UPDATE expenses SET category=$1, amount=$2, description=$3, recipient=$4, date=$5 WHERE id=$6`,
		expense.Category, expense.Amount, expense.Description, expense.Recipient, expense.Date, expense.ID,
	)
	return err
}

func (r *PostgresExpenseRepository) Delete(id int64) error {
	_, err := r.db.Exec("DELETE FROM expenses WHERE id = $1", id)
	return err
}

func (r *PostgresExpenseRepository) List(category *models.ExpenseCategory, startDate, endDate string) ([]models.Expense, error) {
	query := `SELECT id, category, amount, description, COALESCE(recipient, ''), date, created_by, created_at FROM expenses WHERE 1=1`
	var args []interface{}
	argNum := 1

	if category != nil {
		query += fmt.Sprintf(" AND category = $%d", argNum)
		args = append(args, *category)
		argNum++
	}
	if startDate != "" {
		query += fmt.Sprintf(" AND date >= $%d", argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND date <= $%d", argNum)
		args = append(args, endDate)
	}
	query += " ORDER BY date DESC, id DESC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var expenses []models.Expense
	for rows.Next() {
		var e models.Expense
		if err := rows.Scan(&e.ID, &e.Category, &e.Amount, &e.Description, &e.Recipient, &e.Date, &e.CreatedBy, &e.CreatedAt); err != nil {
			return nil, err
		}
		expenses = append(expenses, e)
	}
	return expenses, nil
}

func (r *PostgresExpenseRepository) GetTotalByCategory(category models.ExpenseCategory, startDate, endDate string) (float64, error) {
	query := `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE category = $1`
	args := []interface{}{category}
	argNum := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND date >= $%d", argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND date <= $%d", argNum)
		args = append(args, endDate)
	}

	var total float64
	err := r.db.QueryRow(query, args...).Scan(&total)
	return total, err
}

// ========== Transaction Repository ==========

type PostgresTransactionRepository struct {
	db *sql.DB
}

func NewPostgresTransactionRepository(pg *PostgresDB) *PostgresTransactionRepository {
	return &PostgresTransactionRepository{db: pg.DB}
}

func (r *PostgresTransactionRepository) Create(tx *models.Transaction) error {
	return r.db.QueryRow(`
		INSERT INTO transactions (type, entity_type, entity_id, amount, party_name, date, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		tx.Type, tx.EntityType, tx.EntityID, tx.Amount, tx.PartyName, tx.Date, tx.Description,
	).Scan(&tx.ID)
}

func (r *PostgresTransactionRepository) List(txType *models.TransactionType, startDate, endDate string) ([]models.Transaction, error) {
	query := `SELECT id, type, entity_type, entity_id, amount, COALESCE(party_name, ''), date, COALESCE(description, '') FROM transactions WHERE 1=1`
	var args []interface{}
	argNum := 1

	if txType != nil {
		query += fmt.Sprintf(" AND type = $%d", argNum)
		args = append(args, *txType)
		argNum++
	}
	if startDate != "" {
		query += fmt.Sprintf(" AND date >= $%d", argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND date <= $%d", argNum)
		args = append(args, endDate)
	}
	query += " ORDER BY date DESC, id DESC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(&t.ID, &t.Type, &t.EntityType, &t.EntityID, &t.Amount, &t.PartyName, &t.Date, &t.Description); err != nil {
			return nil, err
		}
		transactions = append(transactions, t)
	}
	return transactions, nil
}

func (r *PostgresTransactionRepository) GetTotalByType(txType models.TransactionType, startDate, endDate string) (float64, error) {
	query := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = $1`
	args := []interface{}{txType}
	argNum := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND date >= $%d", argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND date <= $%d", argNum)
		args = append(args, endDate)
	}

	var total float64
	err := r.db.QueryRow(query, args...).Scan(&total)
	return total, err
}
