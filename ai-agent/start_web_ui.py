#!/usr/bin/env python3
"""
Startup script for VAI AI Agent Web UI
"""

import os
import sys
import subprocess
import time

def main():
    print("🚀 Starting VAI AI Agent Web UI...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('web_ui'):
        print("❌ Error: web_ui directory not found!")
        print("Please run this script from the ai-agent directory")
        sys.exit(1)
    
    # Change to web_ui directory
    os.chdir('web_ui')
    
    # Check if requirements are installed
    print("📦 Checking dependencies...")
    try:
        import flask
        import flask_socketio
        print("✅ Dependencies already installed")
    except ImportError:
        print("📥 Installing dependencies...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
        print("✅ Dependencies installed")
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  No .env file found. Creating example...")
        with open('.env', 'w') as f:
            f.write("""# VAI AI Agent Web UI Configuration
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=your_secret_key_here
""")
        print("✅ Created .env file")
    
    print("\n🌐 Starting web server...")
    print("📍 Web UI will be available at: http://localhost:5001")
    print("🔑 Use demo credentials to login:")
    print("   User ID: demo_user_1")
    print("   Auth Token: demo_token_123")
    print("\n⏹️  Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Start the Flask app
    try:
        subprocess.run([sys.executable, 'app.py'], check=True)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

