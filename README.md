# 🚀 VAI AI Job Portal - Complete Setup Guide

## 📋 Prerequisites

Before starting, make sure your PC has the following installed:

### Required Software:
1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Choose the LTS version

2. **MongoDB** (Database)
   - **Option A: MongoDB Atlas (Cloud - Recommended)**
     - Go to https://www.mongodb.com/atlas
     - Create a free account
     - Create a new cluster
     - Get your connection string
   
   - **Option B: Local MongoDB**
     - Download from: https://www.mongodb.com/try/download/community
     - Install MongoDB Community Server

3. **Git**
   - Download from: https://git-scm.com/
   - For cloning the repository

4. **Code Editor** (Optional but recommended)
   - VS Code: https://code.visualstudio.com/

## 🔄 Step-by-Step Installation

### 1. Clone the Repository
```bash
# Open Command Prompt or PowerShell
git clone https://github.com/vividitcorporation/vai-job-portal.git
cd meta-job-backend
```

### 2. Backend Setup

#### Install Backend Dependencies
```bash
# In the root directory (meta-job-backend)
npm install
```

#### Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb+srv://VividIT:VividItCorp2025@cluster0.jaaxwix.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:3000

# Session Secret
SESSION_SECRET=your_super_secure_session_secret_here

# OAuth Configuration (Optional - for Google/GitHub login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

**Important:** Replace the placeholder values with actual values:
- For `MONGO_URI`: Use your MongoDB Atlas connection string or `mongodb+srv://VividIT:VividItCorp2025@cluster0.jaaxwix.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0` for local MongoDB
- Generate secure random strings for secrets

### 3. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd vivid-frontend
```

#### Install Frontend Dependencies
```bash
npm install
```

#### Frontend Environment Configuration
Create a `.env.local` file in the `vivid-frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Database Setup (Optional)
If you want to populate the database with initial data:

```bash
# Go back to root directory
cd ..

# Run database seeding scripts (optional)
npm run seed
npm run create-users
```

## 🏃‍♂️ Running the Application

### Start the Backend Server
```bash
# In the root directory (meta-job-backend)
npm run dev
```
The backend will run on: http://localhost:5000

### Start the Frontend (New Terminal/Command Prompt)
```bash
# Open a new terminal/command prompt
cd meta-job-backend/vivid-frontend
npm run dev
```
The frontend will run on: http://localhost:3000

## 🌐 Accessing the Application

1. **Open your web browser**
2. **Navigate to:** http://localhost:3000
3. **You should see the job portal homepage**

## 👥 User Roles & Features

The application supports multiple user types:

### 🔍 Job Seeker
- Browse and search jobs
- Apply to positions
- Manage profile and resume

### 🏢 Recruiter
- Post job openings
- Manage job listings
- Review applications

### 🤝 Consultant
- Connect candidates with opportunities
- Browse jobs and candidates

### ⚙️ Admin
- User management
- System configuration
- Platform oversight

## 🛠️ Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Check your `MONGO_URI` in the `.env` file
   - Ensure MongoDB service is running (if using local installation)
   - For MongoDB Atlas, check your IP whitelist

2. **Port Already in Use**
   - Change the `PORT` in `.env` file
   - Or stop other applications using ports 3000/5000

3. **Dependencies Installation Failed**
   - Try deleting `node_modules` and running `npm install` again
   - Ensure you have the latest Node.js version

4. **Environment Variables Not Loading**
   - Double-check `.env` file names and locations
   - Ensure no spaces around the `=` sign in environment variables

## 📁 Project Structure

```
meta-job-backend/
├── src/                    # Backend source code
│   ├── controllers/        # API controllers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── config/            # Configuration files
│   └── index.js           # Main server file
├── vivid-frontend/        # Frontend application
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utility functions
│   └── package.json
├── scripts/               # Database scripts
├── package.json           # Backend dependencies
└── .env                   # Environment variables
```

## 🔧 Available Scripts

### Backend Commands:
```bash
npm run dev         # Start development server
npm start          # Start production server
npm run seed       # Populate database with sample data
npm run create-users # Create initial users
```

### Frontend Commands:
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Check code quality
```

## 🌟 Additional Features

- **Job Crawling**: Automated job scraping from external sites
- **File Upload**: Resume and document management
- **Real-time Updates**: Dynamic job listings
- **Role-based Access**: Secure user management
- **OAuth Integration**: Google/GitHub login support

