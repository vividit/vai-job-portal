# 👥 User Roles & Settings Guide

## 🎯 Available User Roles

### 1. **Job Seeker** (Default)
- **Permissions**: Browse jobs, apply to jobs, manage profile
- **Access**: Public job listings, personal applications
- **Features**: Resume upload, profile management

### 2. **Recruiter** 
- **Permissions**: Post jobs, manage applications, view candidates
- **Access**: Job management, candidate database, analytics
- **Features**: Job creation, application review, candidate communication

### 3. **Consultant**
- **Permissions**: Advanced job management, candidate matching
- **Access**: Extended analytics, bulk operations, advanced features
- **Features**: AI-powered matching, bulk job posting, advanced reporting

### 4. **Admin**
- **Permissions**: Full system access, user management, system settings
- **Access**: All features, user administration, system configuration
- **Features**: User management, system analytics, crawler management

## 🔧 Role-Based API Endpoints

### **Job Seeker Endpoints**
```javascript
// Public endpoints (no auth required)
GET /api/jobs - Browse all jobs
GET /api/jobs/:id - View job details
POST /api/jobs/:id/apply - Apply to job

// Protected endpoints (auth required)
GET /api/jobs/me/applications - View my applications
GET /api/users/me - Get my profile
PUT /api/users/me - Update my profile
POST /api/files/upload/resume - Upload resume
```

### **Recruiter Endpoints**
```javascript
// Job Management
POST /api/jobs/create - Create new job
GET /api/jobs/me/jobs - View my posted jobs
PUT /api/jobs/:id - Update job
DELETE /api/jobs/:id - Delete job

// Application Management
GET /api/jobs/:id/applications - View job applications
PUT /api/jobs/applications/:id/status - Update application status
GET /api/jobs/applications/:id/resume - Download resume

// Analytics
GET /api/crawler/analytics - View job analytics
GET /api/crawler/status - Check crawler status
```

### **Consultant Endpoints**
```javascript
// Advanced Job Management
POST /api/jobs/bulk-create - Bulk job creation
GET /api/jobs/analytics - Advanced job analytics
POST /api/jobs/matching - AI candidate matching

// Advanced Features
GET /api/users/candidates - View all candidates
POST /api/operate - Execute custom operations
GET /api/crawler/advanced-analytics - Advanced crawler analytics
```

### **Admin Endpoints**
```javascript
// User Management
GET /api/users - View all users
PUT /api/users/:id - Update user
DELETE /api/users/:id - Delete user
PUT /api/users/:id/role - Change user role

// System Management
GET /api/config - System configuration
PUT /api/config - Update system settings
POST /api/crawler/cleanup - Clean up old jobs
PATCH /api/crawler/jobs/:id/status - Update job status

// Advanced Analytics
GET /api/crawler/analytics - Full system analytics
GET /api/operate/analytics - Operation analytics
```

## 🛠️ How to Set User Roles

### **Method 1: API Endpoint**
```bash
# Change user role (Admin only)
PUT /api/users/:userId/role
Content-Type: application/json

{
  "role": "recruiter"
}
```

### **Method 2: Database Direct**
```javascript
// MongoDB command
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "recruiter" } }
)
```

### **Method 3: Registration with Role**
```bash
# Register with specific role
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "password123",
  "role": "recruiter"
}
```

## 📊 Role Permissions Matrix

| Feature | Job Seeker | Recruiter | Consultant | Admin |
|---------|------------|-----------|------------|-------|
| Browse Jobs | ✅ | ✅ | ✅ | ✅ |
| Apply to Jobs | ✅ | ❌ | ❌ | ❌ |
| Post Jobs | ❌ | ✅ | ✅ | ✅ |
| Manage Applications | ❌ | ✅ | ✅ | ✅ |
| View All Users | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ✅ |
| Crawler Management | ❌ | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | Basic | ✅ | ✅ |

## 🎨 Frontend Role-Based UI

### **Job Seeker Dashboard**
- Job browsing and search
- Application tracking
- Profile management
- Resume upload

### **Recruiter Dashboard**
- Job posting interface
- Application management
- Candidate database
- Basic analytics

### **Consultant Dashboard**
- Advanced job management
- AI-powered matching
- Bulk operations
- Advanced analytics

### **Admin Dashboard**
- User management
- System configuration
- Full analytics
- Crawler management

## 🔐 Authentication & Authorization

### **Middleware Usage**
```javascript
// Protect routes by role
router.get('/admin/users', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  getUsers
);

// Multiple roles allowed
router.get('/recruiter/jobs', 
  authMiddleware, 
  roleMiddleware(['recruiter', 'consultant', 'admin']), 
  getRecruiterJobs
);
```

### **Role Checking in Controllers**
```javascript
export const createJob = async (req, res) => {
  // Check if user has permission
  if (!['recruiter', 'consultant', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Create job logic...
};
```

## 🚀 Quick Setup Commands

### **Create Admin User**
```bash
# Register admin user
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@company.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### **Create Recruiter User**
```bash
# Register recruiter
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Recruiter User",
    "email": "recruiter@company.com",
    "password": "recruiter123",
    "role": "recruiter"
  }'
```

### **Change User Role**
```bash
# Change role (requires admin token)
curl -X PUT http://localhost:5000/api/users/USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"role": "consultant"}'
```

## 📈 Role-Based Features

### **Job Seeker Features**
- ✅ Job browsing and search
- ✅ Job applications
- ✅ Profile management
- ✅ Resume upload
- ✅ Application tracking

### **Recruiter Features**
- ✅ Job posting
- ✅ Application management
- ✅ Candidate database
- ✅ Basic analytics
- ✅ Email notifications

### **Consultant Features**
- ✅ All recruiter features
- ✅ Bulk job posting
- ✅ AI candidate matching
- ✅ Advanced analytics
- ✅ Custom operations

### **Admin Features**
- ✅ All consultant features
- ✅ User management
- ✅ System configuration
- ✅ Crawler management
- ✅ Full system access

## 🎯 Best Practices

### **1. Role Assignment**
- Assign roles based on user needs
- Use least privilege principle
- Regularly review role assignments

### **2. Security**
- Always validate roles on both frontend and backend
- Use middleware for route protection
- Log role-based actions for audit

### **3. User Experience**
- Show only relevant features based on role
- Provide clear permission messages
- Guide users to appropriate actions

## 🔧 Configuration

### **Environment Variables**
```bash
# Default role for new users
DEFAULT_USER_ROLE=jobseeker

# Allowed roles
ALLOWED_ROLES=jobseeker,recruiter,consultant,admin

# Role hierarchy
ROLE_HIERARCHY=jobseeker,recruiter,consultant,admin
```

### **Database Indexes**
```javascript
// Ensure role-based queries are efficient
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "email": 1, "role": 1 })
```

Your user role system is well-structured and ready to use! 🎉 