package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"tractor-agency/internal/adapters/repository"
	"tractor-agency/internal/core/models"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserExists         = errors.New("username already exists")
)

// AuthService handles authentication logic
type AuthService struct {
	userRepo  repository.UserRepository
	jwtSecret []byte
}

// NewAuthService creates a new auth service
func NewAuthService(ur repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  ur,
		jwtSecret: []byte(jwtSecret),
	}
}

// LoginRequest represents login credentials
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse contains the JWT token
type LoginResponse struct {
	Token    string       `json:"token"`
	User     *models.User `json:"user"`
	ExpireAt int64        `json:"expire_at"`
}

// Claims represents JWT claims
type Claims struct {
	UserID   int64       `json:"user_id"`
	Username string      `json:"username"`
	Role     models.Role `json:"role"`
	jwt.RegisteredClaims
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(req *LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Generate JWT
	expireAt := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expireAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:    tokenString,
		User:     user,
		ExpireAt: expireAt.Unix(),
	}, nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// CreateUser creates a new user (admin only)
func (s *AuthService) CreateUser(username, password, fullName string, role models.Role) error {
	// Check if user exists
	existing, _ := s.userRepo.GetByUsername(username)
	if existing != nil {
		return ErrUserExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := &models.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
		FullName:     fullName,
		Role:         role,
		CreatedAt:    time.Now().Format("2006-01-02 15:04:05"),
	}

	return s.userRepo.Create(user)
}

// GetUser returns a user by ID
func (s *AuthService) GetUser(id int64) (*models.User, error) {
	return s.userRepo.GetByID(id)
}

// ListUsers returns all users
func (s *AuthService) ListUsers() ([]models.User, error) {
	return s.userRepo.List()
}
