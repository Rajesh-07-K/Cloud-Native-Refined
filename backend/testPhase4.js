const axios = require('axios');
const fs = require('fs');

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  
  try {
    // 1. Login as student
    const studentLogin = await axios.post(`${BASE_URL}/auth/login`, { email: 'student@college.edu', password: 'password123' });
    const studentToken = studentLogin.data.token;
    
    // 2. Upload Document
    // Need a dummy file
    fs.writeFileSync('test.pdf', 'dummy content');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('title', 'Phase 4 Test Doc');
    form.append('description', 'Testing hash chaining');
    form.append('department', 'Computer Science');
    form.append('priority', 'high');
    form.append('workflowType', 'standard');
    form.append('file', fs.createReadStream('test.pdf'));

    const uploadRes = await axios.post(`${BASE_URL}/documents/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${studentToken}` }
    });
    const docId = uploadRes.data.document._id;
    console.log(`Document uploaded: ${docId}`);

    // Wait a sec for AI routing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 1: Verify initial hash
    let verifyRes = await axios.get(`${BASE_URL}/documents/${docId}/audit/verify`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log(`Test 1 & 3 (Initial Hash & Verification):`, verifyRes.data);

    // 3. Login as mentor
    const mentorLogin = await axios.post(`${BASE_URL}/auth/login`, { email: 'mentor@college.edu', password: 'password123' });
    const mentorToken = mentorLogin.data.token;

    // 4. Approve Document
    await axios.post(`${BASE_URL}/documents/${docId}/approve`, { comment: 'Approving step 1' }, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    console.log('Document approved by mentor.');

    // Test 2 & 6: Verify second hash
    verifyRes = await axios.get(`${BASE_URL}/documents/${docId}/audit/verify`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    console.log(`Test 2, 3 & 6 (Approval Hash Chain):`, verifyRes.data);

    // 5. Test 4: Tampering
    // We will directly update MongoDB using mongoose to bypass hashing
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://localhost:27017/docflow', { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection;
    const collection = db.collection('documents');
    
    // Tamper with the first entry's comment
    const docObj = await collection.findOne({ _id: new mongoose.Types.ObjectId(docId) });
    docObj.auditLog[0].comment = 'Tampered comment!';
    await collection.updateOne({ _id: new mongoose.Types.ObjectId(docId) }, { $set: { auditLog: docObj.auditLog } });
    console.log('Tampered with DB directly.');

    // Verify again
    verifyRes = await axios.get(`${BASE_URL}/documents/${docId}/audit/verify`, {
      headers: { Authorization: `Bearer ${mentorToken}` }
    });
    console.log(`Test 4 (Tamper Detection):`, verifyRes.data);

    mongoose.disconnect();

  } catch (err) {
    console.error('Test failed:', err.response ? err.response.data : err.message);
  }
}

runTests();
