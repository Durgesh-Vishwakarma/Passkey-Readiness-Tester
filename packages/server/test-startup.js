console.log('🔍 Testing server startup...');

try {
  console.log('1. Checking environment variables...');
  
  if (!process.env.MONGODB_URL) {
    console.log('❌ MONGODB_URL not found');
  } else {
    console.log('✅ MONGODB_URL found');
  }
  
  console.log('2. Testing database connection...');
  
  // Test MongoDB connection
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URL);
  
  client.connect()
    .then(() => {
      console.log('✅ MongoDB connection successful');
      return client.close();
    })
    .then(() => {
      console.log('✅ MongoDB connection closed');
      console.log('3. Starting Express server...');
      
      // Start the actual server
      import('./src/index.js').then(() => {
        console.log('✅ Server module loaded');
      }).catch(err => {
        console.error('❌ Server module error:', err);
      });
    })
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err);
    });
  
} catch (error) {
  console.error('❌ Test failed:', error);
}