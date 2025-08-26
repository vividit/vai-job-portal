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
Repository Structure

Backend: https://github.com/vividit/vai-job-portal
Frontend: https://github.com/vividit/vai-job-portal-frontend

Setup Instructions
1. Clone the Backend Repository
bashgit clone https://github.com/vividit/vai-job-portal.git
cd vai-job-portal
2. Clone the Frontend Inside Backend
bash# Clone frontend repository inside the backend directory
git clone https://github.com/vividit/vai-job-portal-frontend.git vai-frontend
cd vai-frontend
3. Setup Frontend
bash# Install frontend dependencies
npm install

# Run frontend development server
npm run dev
The frontend will typically run on http://localhost:3000
4. Setup Backend
bash# Go back to backend directory
cd ..

# Install backend dependencies
npm install

# Create .env file with your configuration
# Copy .env.example if available, or create new .env file
cp .env.example .env

#### Create `.env` File
Create a file named `.env` in the root directory with these settings:


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

How to Create Google & GitHub OAuth Applications
Google OAuth Setup
Step 1: Go to Google Cloud Console

Visit Google Cloud Console
Sign in with your Google account

Step 2: Create or Select a Project

Click on the project dropdown (top left)
Click "New Project" or select an existing one
Give your project a name (e.g., "Vai Job Portal")
Click "Create"

Step 3: Enable Google+ API

In the sidebar, go to "APIs & Services" > "Library"
Search for "Google+ API"
Click on it and press "Enable"
Also enable "Google OAuth2 API" if available

Step 4: Configure OAuth Consent Screen

Go to "APIs & Services" > "OAuth consent screen"
Choose "External" (unless you have a Google Workspace)
Fill in required fields:

App name: Vai Job Portal
User support email: Your email
Developer contact: Your email


Click "Save and Continue"
Skip "Scopes" for now, click "Save and Continue"
Add test users if needed, click "Save and Continue"

Step 5: Create OAuth Credentials

Go to "APIs & Services" > "Credentials"
Click "Create Credentials" > "OAuth client ID"
Choose "Web application"
Set name: "Vai Job Portal Web Client"
Add Authorized redirect URIs:

http://localhost:5000/auth/google/callback
http://localhost:3000/auth/google/callback (if frontend handles it)


Click "Create"
Copy the Client ID and Client Secret - these go in your .env file


GitHub OAuth Setup
Step 1: Go to GitHub Settings

Go to GitHub
Click your profile picture (top right)
Select "Settings"

Step 2: Create OAuth App

In the left sidebar, click "Developer settings"
Click "OAuth Apps"
Click "New OAuth App"

Step 3: Fill in Application Details

Application name: Vai Job Portal
Homepage URL: http://localhost:3000
Application description: Job portal with OAuth authentication
Authorization callback URL: http://localhost:5000/auth/github/callback

Step 4: Register Application

Click "Register application"
Copy the Client ID - this goes in your .env file
Click "Generate a new client secret"
Copy the Client Secret - this also goes in your .env file


MongoDB Atlas Setup
Step 1: Create MongoDB Atlas Account

Go to MongoDB Atlas
Sign up for free account
Choose "Build a Database"

Step 2: Create Cluster

Choose "Free" tier (M0 Sandbox)
Select cloud provider and region
Name your cluster (e.g., "vai-job-portal")
Click "Create Cluster"

Step 3: Create Database User

Go to "Database Access" in left sidebar
Click "Add New Database User"
Choose "Password" authentication
Set username and password (remember these!)
Set user privileges to "Read and write to any database"
Click "Add User"

Step 4: Configure Network Access

Go to "Network Access" in left sidebar
Click "Add IP Address"
For development, click "Allow Access from Anywhere" (0.0.0.0/0)
For production, add specific IP addresses
Click "Confirm"

Step 5: Get Connection String

Go to "Database" in left sidebar
Click "Connect" on your cluster
Choose "Connect your application"
Copy the connection string
Replace <password> with your database user password
Replace <dbname> with your database name (e.g., "vai-job-portal")

Example: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vai-job-portal?retryWrites=true&w=majority

Generate JWT & Session Secrets
Option 1: Using Node.js
javascript// Run this in Node.js console or create a script
const crypto = require('crypto');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET:', jwtSecret);

// Generate Session Secret
const sessionSecret = crypto.randomBytes(64).toString('hex');
console.log('SESSION_SECRET:', sessionSecret);
Option 2: Using Online Generator

Go to Random.org or similar
Generate a long random string (64+ characters)
Use for JWT_SECRET and SESSION_SECRET

Option 3: Using Command Line
bash# On Mac/Linux
openssl rand -hex 64

# On Windows PowerShell
[System.Web.Security.Membership]::GeneratePassword(64, 0)

Final .env File Structure
env# SERVER CONFIGURATION
PORT=5000
NODE_ENV=development
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# MONGODB ATLAS DATABASE
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vai-job-portal?retryWrites=true&w=majority

# SECRETS
JWT_SECRET=your_generated_jwt_secret_here
SESSION_SECRET=your_generated_session_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_from_console
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_console

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_from_settings
GITHUB_CLIENT_SECRET=your_github_client_secret_from_settings
