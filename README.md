# 🚀 VAI AI Job Portal - Complete Implementation Guide

## 📋 Prerequisites

Before starting, make sure your PC has the following installed:

### Required Software:
1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Choose the LTS version
   - Verify installation: `node --version` and `npm --version`

2. **MongoDB** (Database)
   - **Option A: MongoDB Atlas (Cloud - Recommended)**
     - Go to https://www.mongodb.com/atlas
     - Create a free account
     - Create a new cluster
     - Get your connection string
   
   - **Option B: Local MongoDB**
     - Download from: https://www.mongodb.com/try/download/community
     - Install MongoDB Community Server
     - Start MongoDB service

3. **Git**
   - Download from: https://git-scm.com/
   - For cloning the repository

4. **Code Editor** (Optional but recommended)
   - VS Code: https://code.visualstudio.com/

## 🚀 Complete Implementation Steps

### Step 1: Download the Project
```bash
# Option A: Clone from GitHub (if you have access)
git clone https://github.com/vividitcorporation/vai-job-portal.git
cd meta-job-backend

# Option B: Download ZIP file
# 1. Go to the GitHub repository
# 2. Click "Code" → "Download ZIP"
# 3. Extract to your desired folder
# 4. Rename folder to "meta-job-backend"
# 5. Open terminal/command prompt in that folder
```

### Step 2: Set Up Backend Environment
```bash
# Navigate to project root
cd meta-job-backend

# Install backend dependencies
npm install

# Create environment configuration file
# Create a new file called ".env" in the root directory
```

#### Create `.env` File
Create a file named `.env` in the root directory with these settings:

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

**Important Notes:**
- **For MongoDB Atlas**: Use the provided connection string or create your own
- **For Local MongoDB**: Use `mongodb://localhost:27017/meta-job-portal`
- **Generate Secrets**: Use random strings for SESSION_SECRET and JWT_SECRET

### Step 3: Set Up Frontend Environment
```bash
# Navigate to frontend directory
cd vivid-frontend

# Install frontend dependencies
npm install

# Create frontend environment file
# Create a new file called ".env.local" in the vivid-frontend directory
```

#### Create `.env.local` File
Create a file named `.env.local` in the `vivid-frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 4: Database Setup
```bash
# Go back to root directory
cd ..

# Optional: Populate database with sample data
npm run seed
npm run create-users
```

**Note:** If you get errors, make sure MongoDB is running and your connection string is correct.

### Step 5: Start the Application

#### Terminal 1: Start Backend Server
```bash
# In the root directory (meta-job-backend)
npm run dev
```
**Expected Output:**
```
Server running on port 5000
MongoDB connected successfully
```

#### Terminal 2: Start Frontend Server
```bash
# Open a new terminal/command prompt
cd meta-job-backend/vivid-frontend
npm run dev
```
**Expected Output:**
```
Ready - started server on 0.0.0.0:3000
```

### Step 6: Access Your Application
1. **Open your web browser**
2. **Navigate to:** http://localhost:3000
3. **You should see the job portal homepage**

## 🧪 Testing Your Implementation

### Test Backend API
```bash
# Test if backend is running
curl http://localhost:5000/api/health
# Should return a response
```

### Test Frontend
- Open http://localhost:3000 in your browser
- Check browser console for any errors
- Try navigating between pages

### Test Database Connection
- Check terminal where backend is running
- Look for "MongoDB connected successfully" message
- If you see connection errors, check your `.env` file

## 🛠️ Troubleshooting Common Issues

### Issue 1: "Port Already in Use"
```bash
# Solution: Change port in .env file
PORT=5001  # Change from 5000 to 5001

# Then update frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Issue 2: "MongoDB Connection Failed"
```bash
# Check your .env file
# Ensure MONGO_URI is correct
# For local MongoDB, make sure service is running

# Windows: Check Services app
# Mac/Linux: sudo systemctl status mongod
```

### Issue 3: "Module Not Found" Errors
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Do the same for frontend
cd vivid-frontend
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: "Environment Variables Not Loading"
```bash
# Check file names: .env (not .env.txt)
# Check file locations: .env in root, .env.local in vivid-frontend
# Restart your terminal/command prompt
# Restart both servers
```

## 🔧 Available Commands

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

## 📁 Project Structure Explained

```
meta-job-backend/
├── src/                    # Backend source code
│   ├── controllers/        # API controllers (handles requests)
│   ├── models/            # Database models (data structure)
│   ├── routes/            # API routes (endpoints)
│   ├── config/            # Configuration files
│   └── index.js           # Main server file
├── vivid-frontend/        # Frontend application
│   ├── src/
│   │   ├── app/           # Next.js pages (routes)
│   │   ├── components/    # React components (UI)
│   │   └── lib/           # Utility functions
│   └── package.json
├── scripts/               # Database scripts
├── package.json           # Backend dependencies
└── .env                   # Environment variables
```

## 🌟 Features You Can Test

### User Management
- **Sign Up**: Create new user accounts
- **Login**: Authenticate existing users
- **Role-based Access**: Different dashboards for different user types

### Job Portal Features
- **Browse Jobs**: View available positions
- **Post Jobs**: Recruiters can create job listings
- **Apply for Jobs**: Job seekers can submit applications

### Admin Features
- **User Management**: View and manage all users
- **System Configuration**: Adjust platform settings
- **Job Crawling**: Automated job scraping

## 🚀 Next Steps After Implementation

1. **Customize the Application**
   - Modify colors and branding in `vivid-frontend/src/app/globals.css`
   - Update company information in components
   - Adjust database models if needed

2. **Add Your Own Features**
   - Create new API endpoints in `src/routes/`
   - Add new pages in `vivid-frontend/src/app/`
   - Implement new components in `vivid-frontend/src/components/`

3. **Deploy to Production**
   - Set up production MongoDB database
   - Configure production environment variables
   - Deploy backend to hosting service (Heroku, AWS, etc.)
   - Deploy frontend to Vercel, Netlify, or similar

## 📞 Getting Help

If you encounter issues:
1. **Check the console** for error messages
2. **Verify all prerequisites** are installed correctly
3. **Double-check environment variables** in `.env` files
4. **Ensure both servers** are running (backend + frontend)
5. **Check MongoDB connection** and service status

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🎉 Congratulations! You've successfully implemented the VAI AI Job Portal on your device!**

**Next: Open http://localhost:3000 and start exploring your new job portal!**
