require('dotenv').config();
const mongoose = require('mongoose');
const { runSlaMonitorOnce } = require('../jobs/slaMonitor');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docflow';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB for SLA Test');

    await runSlaMonitorOnce();

    console.log('✅ SLA Test script completed');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error running SLA test:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
