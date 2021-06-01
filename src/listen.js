const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const { DateTime } = require('luxon');
const addresses = require('../config/addresses');
const params = require('../config/params');
const environment = require('../config/environment');
const Web3Utils = require('web3-utils');
// const setup = require('./setup');
const { 
  provider,
  signer,
  account,
  factory,
  router,
  // calculateGas 
} = require('./utils/setup');
const { 
  buyToken,
  sellToken, 
  logReceipt,
  calculateAmountOutMin,
  calculateGas 
} = require('./utils/tradeHelpers');

const config = environment.config;
const settings = environment.settings;

const listen = async (_tokenIn, _tokenOut, _pairAddress) => {
  
  console.log('-'.repeat(100));
  const now = DateTime.now();
  console.log(now.toLocaleString(DateTime.DATETIME_MED));

  // const weth = WETH[config.chainId];

  let token0, token1;
  if(_tokenIn === config.weth){
    token0 = _tokenIn;
    token1 = _tokenOut;
  }else {
    console.log('switch token order');
    token0 = _tokenOut;
    token1 = _tokenIn;
  }
  
  console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${_pairAddress}
  `);
  
  const tokenIn = await Fetcher.fetchTokenData(config.chainId, token0);
  const tokenOut = await Fetcher.fetchTokenData(config.chainId, token1);

  const tokenInContract = new ethers.Contract(
    tokenIn.address,
    [
      'function balanceOf(address _owner) public view returns (uint balance)',
      'function approve(address spender, uint value) public returns(bool)'
    ],      
    account
  );
  const tokenOutContract = new ethers.Contract(
    tokenOut.address,
    [
      'function balanceOf(address _owner) public view returns (uint balance)',
      'function approve(address spender, uint value) public returns(bool)'
    ],      
    account
  );

  const pair = await Fetcher.fetchPairData(
    tokenOut, 
    tokenIn,
    provider
  ); //order doesn't matter

  console.log('pair: ', pair);
  // event PairCreated(address indexed token0, address indexed token1, address pair, uint);
  // event Mint(address indexed sender, uint amount0, uint amount1);
  // pair.on('Mint', async (address, amount0, amount1) => {
  //   console.log('on MINT');
  // })
  // factory.on('PairCreated', async (token0, token1, pairAddress) => {
  //   listen(token0, token1, pairAddress);
  // })
  
  const route = new Route([pair], tokenIn);  //2nd param (weth) is the input token
  
  const amountTokensIn = settings.tokensInETH;
  console.log('amountTokensIn: ', amountTokensIn);
  const amountIn = ethers.utils.parseUnits(amountTokensIn, 'ether');
  console.log('amountIn: ', amountIn.toString());

  const trade = new Trade(route, new TokenAmount(
    tokenIn,
    amountIn
  ), TradeType.EXACT_INPUT);
 
  console.log('Trade Execution Price: ');
  console.log(trade.executionPrice.toSignificant(6), ' tokenOut:', tokenOut.address, ' per tokenIn', tokenIn.address);

  const path = [
    tokenIn.address, 
    tokenOut.address
  ];

  const gas = await calculateGas(provider, amountIn);

  let transactionSettings = {
    gasLimit: gas.gasLimit,
    gasPrice: gas.gasPrice
  }

  const amountOutMin = await calculateAmountOutMin(trade);
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * settings.deadlineMinutes;  //20 is the number of minutes
  console.log('deadline: ', deadline);

  try {
    const result = await buyToken(amountIn, amountOutMin, path, config.wallet, deadline, transactionSettings);
    console.log('Receipt: ', result);

    const receiptData = await logReceipt(result.receipt, provider, result.transaction);
    console.log('receiptData: ', receiptData);
    
  } catch(err) {
    console.log(err);
  }
  
  console.log('Process Complete');
  const done = DateTime.now();
  console.log(done.toLocaleString(DateTime.DATETIME_MED));
  console.log('-'.repeat(100));
  
}

if(settings.listenerDebug){
  console.log('--- Debug Mode ---');
  const token1 = config.weth;
  const token0 = config.desiredToken;
  const pairAddress = 'no-pair-address-found';
  listen(token0, token1, pairAddress);
}else {
  console.log('--- LIVE MODE ---');
  factory.on('PairCreated', async (token0, token1, pairAddress) => {
    listen(token0, token1, pairAddress);
  })
}
