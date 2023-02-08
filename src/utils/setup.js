const ethers = require('ethers');
const Web3Utils = require('web3-utils');
const environment = require('../../config/environment');

const config = environment.config;
const settings = environment.settings;

console.log('Network: ', config.network);

const provider = ethers.getDefaultProvider(config.network);
const signer = new ethers.Wallet(config.privateKey);
const account = signer.connect(provider);

const factory = new ethers.Contract(
  config.uniswapFactory,  //the factory of uniswap
  ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],  //this is the abi.  ethers has a featur 'human readable abi' so you can just write it out.  here we just put the parts we are interested in, but there is much more in the abi
  account  //address we use to sign transaction
);

const router = new ethers.Contract(
  config.uniswapRouter,
  [
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts)',
  ],
  account
);

exports.provider = provider;
exports.signer = signer;
exports.account = account;
exports.factory = factory;
exports.router = router;