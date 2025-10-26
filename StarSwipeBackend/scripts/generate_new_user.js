
// quick one-liner (Node REPL)
const StellarSdk = require('stellar-sdk');
const pair = StellarSdk.Keypair.random();
console.log(pair.publicKey(), pair.secret());

