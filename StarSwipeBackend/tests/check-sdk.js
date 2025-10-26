const StellarSdk = require('@stellar/stellar-sdk');

console.log('🔍 Stellar SDK Diagnostics\n');

console.log('SDK Package Info:');
try {
  const pkg = require('@stellar/stellar-sdk/package.json');
  console.log('  Version:', pkg.version);
} catch (e) {
  console.log('  Could not read package.json');
}

console.log('\n📦 Available exports:');
console.log('  SorobanRpc:', typeof StellarSdk.SorobanRpc);
console.log('  authorizeEntry:', typeof StellarSdk.authorizeEntry);
console.log('  Contract:', typeof StellarSdk.Contract);
console.log('  Address:', typeof StellarSdk.Address);

console.log('\n🔧 Checking authorizeEntry signature...');
if (typeof StellarSdk.authorizeEntry === 'function') {
  console.log('  Function exists!');
  console.log('  Length (params):', StellarSdk.authorizeEntry.length);
  console.log('  toString:', StellarSdk.authorizeEntry.toString().substring(0, 200));
}

console.log('\n🔧 Checking if authorizeEntry is async...');
const testResult = StellarSdk.authorizeEntry.constructor.name;
console.log('  Constructor name:', testResult);

console.log('\n✅ Diagnostics complete!');
