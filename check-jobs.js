import mongoose from 'mongoose';
import Job from './src/models/Job.js';

async function checkJobs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/meta-job-backend');
    console.log('✅ Connected to MongoDB');
    
    const totalJobs = await Job.countDocuments();
    console.log('📊 Total jobs in database:', totalJobs);
    
    const crawledJobs = await Job.countDocuments({ source: { $ne: 'internal' } });
    console.log('🕷️ Crawled jobs:', crawledJobs);
    
    const remoteOKJobs = await Job.countDocuments({ source: 'RemoteOK' });
    console.log('🌐 RemoteOK jobs:', remoteOKJobs);
    
    const activeJobs = await Job.countDocuments({ isActive: true });
    console.log('🟢 Active jobs:', activeJobs);
    
    // Show sample job structure
    const sampleJob = await Job.findOne({ source: 'RemoteOK' }).lean();
    if (sampleJob) {
      console.log('📋 Sample job structure:');
      console.log('  Title:', sampleJob.title);
      console.log('  Company:', sampleJob.company);
      console.log('  Source:', sampleJob.source);
      console.log('  Status:', sampleJob.status);
      console.log('  isActive:', sampleJob.isActive);
      console.log('  Skills:', sampleJob.skills);
      console.log('  Tags:', sampleJob.tags);
      console.log('  Created:', sampleJob.createdAt);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkJobs();
