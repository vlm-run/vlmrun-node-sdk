const { VlmRun } = require('./dist/index.js');
const fs = require('fs');
const path = require('path');

function createTestFile(sizeInMB, filename) {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  const buffer = Buffer.alloc(sizeInBytes, 'A');
  fs.writeFileSync(filename, buffer);
  return filename;
}

async function loadTestUpload() {
  console.log('Starting upload load test...');
  
  const client = new VlmRun({
    apiKey: process.env.VLM_API_KEY || 'test-key',
    baseURL: process.env.TEST_API_BASE_URL || 'http://localhost:8080'
  });

  const testFiles = [
    { size: 1, name: 'test-1mb.txt' },
    { size: 5, name: 'test-5mb.txt' },
    { size: 10, name: 'test-10mb.txt' },
    { size: 35, name: 'test-35mb.txt' }
  ];

  const concurrentUploads = 5;
  const results = [];

  try {
    for (const fileSpec of testFiles) {
      console.log(`\nTesting ${fileSpec.size}MB file with ${concurrentUploads} concurrent uploads...`);
      
      const filename = await createTestFile(fileSpec.size, fileSpec.name);
      const uploadPromises = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentUploads; i++) {
        const uploadPromise = client.files.upload({
          file: filename,
          purpose: 'assistants'
        }).then(result => {
          return {
            success: true,
            fileId: result.id,
            size: result.bytes,
            uploadIndex: i
          };
        }).catch(error => {
          return {
            success: false,
            error: error.message,
            uploadIndex: i
          };
        });
        
        uploadPromises.push(uploadPromise);
      }
      
      const uploadResults = await Promise.all(uploadPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successCount = uploadResults.filter(r => r.success).length;
      const failureCount = uploadResults.filter(r => !r.success).length;
      
      results.push({
        fileSize: fileSpec.size,
        concurrentUploads,
        successCount,
        failureCount,
        totalTimeMs: totalTime,
        avgTimePerUpload: totalTime / concurrentUploads
      });
      
      console.log(`Results: ${successCount} successful, ${failureCount} failed`);
      console.log(`Total time: ${totalTime}ms, Average per upload: ${totalTime / concurrentUploads}ms`);
      
      fs.unlinkSync(filename);
    }
    
    console.log('\n=== LOAD TEST SUMMARY ===');
    results.forEach(result => {
      console.log(`${result.fileSize}MB: ${result.successCount}/${result.concurrentUploads} successful, avg ${result.avgTimePerUpload.toFixed(0)}ms per upload`);
    });
    
    const overallSuccess = results.every(r => r.successCount === r.concurrentUploads);
    console.log(`\nOverall result: ${overallSuccess ? 'PASS' : 'FAIL'}`);
    
    return overallSuccess;
    
  } catch (error) {
    console.error('Load test failed:', error);
    return false;
  }
}

if (require.main === module) {
  loadTestUpload().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { loadTestUpload };
