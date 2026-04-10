require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Module = require('./models/Module');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/courseDB');
  console.log('Connected to MongoDB');

  // Create admin
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@yourcourse.com' });
  if (!existingAdmin) {
    await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@yourcourse.com',
      phone: '03001234567',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
      isApproved: true
    });
    console.log('✅ Admin created');
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // Create sample modules
  const moduleCount = await Module.countDocuments();
  if (moduleCount === 0) {
    await Module.insertMany([
      { title: 'Introduction to the Course', description: 'Welcome and course overview', order: 1, duration: '30 min' },
      { title: 'Module 1: Fundamentals', description: 'Core concepts and basics', order: 2, duration: '1h 20m' },
      { title: 'Module 2: Intermediate Topics', description: 'Building on the fundamentals', order: 3, duration: '2h 10m' },
      { title: 'Module 3: Advanced Techniques', description: 'Deep dive into advanced topics', order: 4, duration: '1h 45m' },
      { title: 'Final Project & Assessment', description: 'Apply everything you have learned', order: 5, duration: '3h' }
    ]);
    console.log('✅ Sample modules created');
  }

  console.log('\n🎉 Seeding complete!');
  console.log(`Admin Email: ${process.env.ADMIN_EMAIL || 'admin@yourcourse.com'}`);
  console.log(`Admin Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });