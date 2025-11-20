/**
 * Generate a secure JWT secret
 * Run: node generate-jwt-secret.js
 */

const crypto = require('crypto');

// Generate a 64-character random hex string (256 bits)
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('\n✅ Generated JWT Secret:');
console.log('='.repeat(70));
console.log(jwtSecret);
console.log('='.repeat(70));
console.log('\n📝 Add this to your .env file as:');
console.log(`JWT_SECRET=${jwtSecret}\n`);



