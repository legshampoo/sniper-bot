const addresses = require('../config/addresses');
const params = require('../config/params');

console.log('CONFIGURATION');
console.log('process.env.NETWORK: ', process.env.NETWORK);

let config;
let settings;
switch(process.env.NETWORK) {
  case 'ROPSTEN':
    console.log('Ropsten Config');
    config = addresses.ropsten;
    settings = params.ropsten;
    settings.sellEth = params.sellEth;
    break;
  case 'MAINNET':
    console.log('Mainnet Config');
    config = addresses.mainnet;
    settings = params.mainnet;
    settings.sellEth = params.sellEth;
    break;
  default:
    // config = addresses.listen;
    break;
}

exports.config = config;
exports.settings = settings;