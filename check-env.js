#!/usr/bin/env node
require('dotenv').config();

console.log('🔍 Environment Variables Check\n');

const requiredVars = [
  'MONGODB_URI',
  'SESSION_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'ADMIN_EMAILS'
];

const optionalVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'DISCORD_WEBHOOK_URL',
  'PORT'
];

let hasAllRequired = true;
let hasCloudinary = true;

console.log('📋 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Show partial value for security
    let displayValue = value;
    if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
      displayValue = '***' + value.slice(-4);
    } else if (varName === 'MONGODB_URI') {
      displayValue = value.substring(0, 20) + '...' + value.slice(-10);
    } else if (value.length > 50) {
      displayValue = value.substring(0, 30) + '...';
    }
    console.log(`  ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${varName}: NOT SET`);
    hasAllRequired = false;
  }
});

console.log('\n📦 Optional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    let displayValue = value;
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      displayValue = '***' + value.slice(-4);
    } else if (value.length > 50) {
      displayValue = value.substring(0, 30) + '...';
    }
    console.log(`  ✅ ${varName}: ${displayValue}`);
    
    if (varName.includes('CLOUDINARY')) {
      // Track if any cloudinary var is set
    }
  } else {
    console.log(`  ⚠️  ${varName}: not set`);
    if (varName.includes('CLOUDINARY')) {
      hasCloudinary = false;
    }
  }
});

console.log('\n📊 Summary:');
if (hasAllRequired) {
  console.log('  ✅ All required variables are set!');
  console.log('  ✅ You can start the server with: npm run dev');
  if (!hasCloudinary) {
    console.log('  ⚠️  Cloudinary not configured - image uploads will fail');
    console.log('     Get credentials from: https://cloudinary.com');
  }
  process.exit(0);
} else {
  console.log('  ❌ Some required variables are missing!');
  console.log('  📝 Edit your .env file and add the missing values');
  console.log('  💡 See .env.example for reference');
  process.exit(1);
}
