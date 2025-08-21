import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Sample users data
    const users = [
      {
        name: 'Admin User',
        email: 'admin@company.com',
        password: 'admin123',
        role: 'admin',
        status: 'active'
      },
      {
        name: 'Recruiter User',
        email: 'recruiter@company.com',
        password: 'recruiter123',
        role: 'recruiter',
        status: 'active'
      },
      {
        name: 'Consultant User',
        email: 'consultant@company.com',
        password: 'consultant123',
        role: 'consultant',
        status: 'active'
      },
      {
        name: 'Job Seeker User',
        email: 'jobseeker@example.com',
        password: 'jobseeker123',
        role: 'jobseeker',
        status: 'active'
      }
    ];

    console.log('🔄 Creating users...');

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
    }

    console.log('\n🎉 User creation completed!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    users.forEach(user => {
      console.log(`👤 ${user.role.toUpperCase()}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log('');
    });

    console.log('🔗 API Endpoints:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('POST /auth/login - Login with credentials');
    console.log('GET /api/users - View all users (Admin/Consultant)');
    console.log('GET /api/users/stats - User statistics (Admin/Consultant)');
    console.log('PUT /api/users/:userId/role - Change user role (Admin only)');
    console.log('GET /api/users/role/:role - Get users by role (Admin/Consultant)');

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
createUsers(); 