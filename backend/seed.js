/**
 * DocFlow Database Seed Script
 * Run: node seed.js
 * Creates demo admin, manager, and staff accounts + sample documents
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Document = require('./models/Document');
const Notification = require('./models/Notification');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/docflow';

const SEED_USERS = [
  { name: 'Dr. Rajesh Kumar', email: 'admin@college.edu', password: 'password123', role: 'administration', department: 'Administration' },
  { name: 'Prof. Amit Sharma', email: 'hod@college.edu', password: 'password123', role: 'hod', department: 'Computer Science' },
  { name: 'Dr. Priya Desai', email: 'mentor@college.edu', password: 'password123', role: 'mentor', department: 'Computer Science' },
  { name: 'Rahul Verma', email: 'student@college.edu', password: 'password123', role: 'student', department: 'Computer Science' },
  { name: 'Sunita Reddy', email: 'library@college.edu', password: 'password123', role: 'administration', department: 'Library' },
];

const SAMPLE_DOCS = [
  { title: 'Bonafide Certificate Request', department: 'Computer Science', priority: 'medium', workflowType: 'multi-level', status: 'pending', description: 'Requesting a bonafide certificate for opening a student bank account.' },
  { title: 'Medical Leave Application', department: 'Computer Science', priority: 'medium', workflowType: 'fast-track', status: 'approved', description: 'Request for 3 days of medical leave due to viral fever.' },
  { title: 'Library Book Requisition', department: 'Library', priority: 'urgent', workflowType: 'standard', status: 'under_review', description: 'Request for new CS reference books for the library.' },
  { title: 'Lab Equipment Upgrade Proposal', department: 'Computer Science', priority: 'high', workflowType: 'standard', status: 'escalated', description: 'Proposal to upgrade network infrastructure in CS Labs.' },
  { title: 'Semester 1 Grade Report', department: 'Administration', priority: 'low', workflowType: 'fast-track', status: 'approved', description: 'Consolidated grade report.' },
  { title: 'Academic Council Meeting Minutes', department: 'Administration', priority: 'medium', workflowType: 'multi-level', status: 'pending', description: 'Minutes from the recent acedemic council meeting.' },
  { title: 'Exam Timetable Adjusment', department: 'Administration', priority: 'medium', workflowType: 'standard', status: 'rejected', description: 'Proposed amendments to the exam timetable.' },
  { title: 'Research Grant Access Request', department: 'Computer Science', priority: 'low', workflowType: 'fast-track', status: 'approved', description: 'Request for access to research grants.' },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([User.deleteMany({}), Document.deleteMany({}), Notification.deleteMany({})]);
    console.log('🗑️  Cleared existing data');

    // Create uploads sample dir
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Create a dummy sample file
    const sampleFilePath = `${uploadsDir}/sample-document.pdf`;
    if (!fs.existsSync(sampleFilePath)) {
      fs.writeFileSync(sampleFilePath, 'DocFlow Sample Document - This is a placeholder file for seeded documents.');
    }

    // Create users
    const createdUsers = [];
    for (const userData of SEED_USERS) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.email} (${user.role})`);
    }

    const admin = createdUsers.find(u => u.role === 'administration');
    const manager = createdUsers.find(u => u.role === 'hod' && u.department === 'Computer Science');
    const staff = createdUsers.find(u => u.role === 'student' && u.department === 'Computer Science');

    // Create documents
    for (const docData of SAMPLE_DOCS) {
      const uniqueDocId = `DOC-${uuidv4().split('-')[0].toUpperCase()}-${Date.now()}`;
      const uploader = docData.department === 'Computer Science' ? staff : createdUsers.find(u => u.department === docData.department && u.role === 'student') || staff;
      const holder = docData.status === 'pending' || docData.status === 'under_review' ? manager : admin;

      const qrData = JSON.stringify({ id: uniqueDocId, title: docData.title, url: `http://localhost:3000/documents/` });
      const qrCode = await QRCode.toDataURL(qrData);

      const auditLog = [
        { action: 'UPLOADED', performedBy: uploader._id, comment: 'Document uploaded', fromStatus: null, toStatus: 'pending', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ];

      if (docData.status === 'approved') {
        auditLog.push({ action: 'APPROVED', performedBy: manager._id, comment: 'Looks good, approved.', fromStatus: 'pending', toStatus: 'approved', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
      } else if (docData.status === 'rejected') {
        auditLog.push({ action: 'REJECTED', performedBy: manager._id, comment: 'Missing required signatures.', fromStatus: 'pending', toStatus: 'rejected', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) });
      } else if (docData.status === 'escalated') {
        auditLog.push({ action: 'ESCALATED', performedBy: manager._id, comment: 'Needs admin attention.', fromStatus: 'pending', toStatus: 'escalated', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) });
      } else if (docData.status === 'under_review') {
        auditLog.push({ action: 'APPROVED', performedBy: manager._id, comment: 'Step 1 approved, forwarding.', fromStatus: 'pending', toStatus: 'under_review', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) });
      }

      const doc = await Document.create({
        uniqueId: uniqueDocId,
        title: docData.title,
        description: docData.description,
        department: docData.department,
        priority: docData.priority,
        workflowType: docData.workflowType,
        status: docData.status,
        uploadedBy: uploader._id,
        currentHolder: holder._id,
        fileUrl: '/uploads/sample-document.pdf',
        fileName: `${docData.title.replace(/\s+/g, '_')}.pdf`,
        fileSize: 24576,
        fileType: 'application/pdf',
        qrCode,
        totalWorkflowSteps: docData.workflowType === 'fast-track' ? 1 : docData.workflowType === 'standard' ? 2 : docData.workflowType === 'multi-level' ? 3 : 4,
        workflowStep: docData.status === 'approved' ? 2 : docData.status === 'under_review' ? 1 : 0,
        auditLog,
        approvedAt: docData.status === 'approved' ? new Date() : null,
        rejectedAt: docData.status === 'rejected' ? new Date() : null,
        rejectionReason: docData.status === 'rejected' ? 'Missing required signatures — please resubmit with all approvals.' : ''
      });

      console.log(`📄 Created document: ${doc.title} [${doc.status}]`);

      // Create notifications
      if (docData.status === 'pending' || docData.status === 'under_review') {
        await Notification.create({
          recipient: manager._id,
          type: 'approval_request',
          title: 'New Document Pending Approval',
          message: `"${doc.title}" requires your approval. Priority: ${doc.priority}`,
          document: doc._id
        });
      }

      if (docData.status === 'approved') {
        await Notification.create({
          recipient: uploader._id,
          type: 'approved',
          title: 'Document Fully Approved! 🎉',
          message: `"${doc.title}" has been fully approved.`,
          document: doc._id
        });
      }
    }

    console.log('\n✅ Database seeded successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    SEED_USERS.forEach(u => console.log(`  ${u.role.padEnd(8)} | ${u.email.padEnd(30)} | password123`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
