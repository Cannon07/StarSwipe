
import StellarHDWallet from 'stellar-hd-wallet';

const mnemonic = 'silver dad trend long bridge maze august degree flat remind cradle slide';

const wallet = StellarHDWallet.fromMnemonic(mnemonic);

const secret = wallet.getSecret(0);
const publicKey = wallet.getPublicKey(0);

console.log('Derived secret:', secret);
console.log('Derived publicKey:', publicKey);

