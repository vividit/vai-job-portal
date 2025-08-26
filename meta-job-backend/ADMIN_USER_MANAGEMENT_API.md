# Admin User Management API

This document describes the admin user management endpoints that allow administrators to create, update, delete, and manage users in the system.

## Authentication Required

All endpoints require:
- Valid JWT token in the `Authorization` header: `Bearer <token>`
- Admin role (role: "admin")

## API Endpoints

### 1. Create New User
**POST** `/api/users`

Creates a new user in the system.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "jobseeker",
  "status": "active",
  "companyId": "optional-company-id-for-recruiters"
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "jobseeker",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- `name`: Required, string
- `email`: Required, valid email, unique
- `password`: Required, minimum 6 characters
- `role`: Optional, one of ["jobseeker", "recruiter", "consultant", "admin"]
- `status`: Optional, one of ["active", "disabled"]
- `companyId`: Optional, only for recruiters

---

### 2. Get All Users
**GET** `/api/users`

Retrieves all users in the system (admin and consultant access).

**Response (200):**
```json
{
  "data": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "jobseeker",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Update User Information
**PUT** `/api/users/{id}`

Updates user information (admin only).

**Request Body:**
```json
{
  "name": "Updated Name",
  "status": "disabled",
  "role": "recruiter",
  "companyId": "company_id"
}
```

**Response (200):**
```json
{
  "data": {
    "_id": "user_id",
    "name": "Updated Name",
    "email": "john@example.com",
    "role": "recruiter",
    "status": "disabled",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 4. Reset User Password
**PUT** `/api/users/{userId}/reset-password`

Resets a user's password (admin only).

**Request Body:**
```json
{
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully",
  "userId": "user_id"
}
```

**Validation:**
- Password must be at least 6 characters
- Admin cannot reset their own password through this endpoint

---

### 5. Change User Password (Alternative)
**PUT** `/api/users/{id}/password`

Alternative endpoint to change user password (admin only).

**Request Body:**
```json
{
  "password": "newPassword123"
}
```

**Response (200):**
```json
{
  "message": "User password updated successfully",
  "userId": "user_id"
}
```

---

### 6. Change User Role
**PUT** `/api/users/{userId}/role`

Changes a user's role (admin only).

**Request Body:**
```json
{
  "role": "consultant"
}
```

**Response (200):**
```json
{
  "message": "User role updated successfully",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "consultant",
    "status": "active",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  }
}
```

**Validation:**
- Role must be one of: ["jobseeker", "recruiter", "consultant", "admin"]
- Admin cannot change their own role

---

### 7. Delete User
**DELETE** `/api/users/{id}`

Deletes a user from the system (admin only).

**Response (200):**
```json
{
  "message": "User deleted successfully",
  "deletedUser": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "jobseeker"
  }
}
```

**Security Rules:**
- Admin cannot delete their own account
- Cannot delete the last admin user in the system

---

### 8. Get Users by Role
**GET** `/api/users/role/{role}`

Retrieves users filtered by role (admin and consultant access).

**Response (200):**
```json
{
  "data": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "jobseeker",
      "status": "active"
    }
  ],
  "count": 1,
  "role": "jobseeker"
}
```

---

### 9. Get User Statistics
**GET** `/api/users/stats`

Retrieves user statistics and analytics (admin and consultant access).

**Response (200):**
```json
{
  "data": {
    "totalUsers": 150,
    "activeUsers": 140,
    "roleBreakdown": [
      {
        "_id": "jobseeker",
        "count": 100,
        "active": 95,
        "disabled": 5
      },
      {
        "_id": "recruiter",
        "count": 30,
        "active": 28,
        "disabled": 2
      }
    ],
    "summary": {
      "jobseekers": 100,
      "recruiters": 30,
      "consultants": 15,
      "admins": 5
    }
  }
}
```

---

## Error Responses

### Common Error Codes:

**400 - Bad Request**
```json
{
  "error": "Validation error message",
  "allowedRoles": ["jobseeker", "recruiter", "consultant", "admin"]
}
```

**401 - Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 - Forbidden**
```json
{
  "error": "Only admins can perform this action"
}
```

**404 - Not Found**
```json
{
  "error": "User not found"
}
```

**500 - Server Error**
```json
{
  "error": "Internal server error message"
}
```

---

## Usage Examples

### Creating a New User with cURL:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "securepass123",
    "role": "recruiter",
    "status": "active"
  }'
```

### Resetting a User's Password:
```bash
curl -X PUT http://localhost:3000/api/users/USER_ID/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "newPassword": "newSecurePassword123"
  }'
```

### Deleting a User:
```bash
curl -X DELETE http://localhost:3000/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

## Security Considerations

1. **Admin Only**: All user management operations require admin role
2. **Self-Protection**: Admins cannot delete their own accounts or change their own roles
3. **Last Admin**: The system prevents deletion of the last admin user
4. **Password Security**: Passwords are hashed using bcrypt before storage
5. **Input Validation**: All inputs are validated for type, format, and business rules
6. **Authentication**: JWT token required for all operations

---

## Integration Notes

- The user management API integrates with the existing authentication system
- User passwords are automatically hashed using the User model's pre-save middleware
- Role changes are immediately effective for subsequent API calls
- User status changes affect login capabilities (disabled users cannot log in)
- All operations are logged for audit trails (if logging is configured)
