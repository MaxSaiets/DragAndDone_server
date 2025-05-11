// Firebase
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path')

// FOR DEPLOY
const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

//const serviceAccount = require('./keys/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://reactmarket-79722.appspot.com',
  retryOptions: {
    autoRetry: true,
    retryDelayMultiplier: 2,
    totalTimeout: 600,
    maxRetryDelay: 64,
    maxRetries: 10,
  },
});

const bucket = admin.storage().bucket();

async function uploadFile(filePath, destination) {
  try {
    await bucket.upload(filePath, {
      destination: destination,
    });
    console.log(`${filePath} uploaded to ${destination}`);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

module.exports = { admin, bucket, uploadFile };
