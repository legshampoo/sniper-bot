const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const environment = require('../config/environment');
const { DateTime } = require('luxon');
const ethers = require('ethers');
const { 
  provider,
  signer,
  account,
  factory,
  router
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

console.log('CONFIG: ', config);
console.log('SETTINGS: ', settings);
console.log('num: ', settings.numTokensToSell)

const sell = async () => {
  console.log('-'.repeat(100));
  console.log('SELL TOKENS');

  const now = DateTime.now();
  console.log(now.toLocaleString(DateTime.DATETIME_MED));

  let token0 = config.desiredToken;
  let token1 = config.weth;

  console.log(`
    Sell Tokens
    =================
    token0: ${token0}
    token1: ${token1}
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

  const route = new Route([pair], tokenIn);  //2nd param (weth) is the input token
  
  const amountTokensIn = settings.numTokensToSell;
  console.log('amountTokensIn: ', amountTokensIn);
  const amountIn = ethers.utils.parseUnits(amountTokensIn, 'ether');
  
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

  const gas = await calculateGas(provider);

  let transactionSettings = {
    gasLimit: gas.gasLimit,
    gasPrice: gas.gasPrice
  }

  const amountOutMin = await calculateAmountOutMin(trade);
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * settings.deadlineMinutes;  //20 is the number of minutes
  console.log('deadline: ', deadline);

  try {
    console.log('Sending Transaction');
    const result = await sellToken(tokenInContract, amountIn, amountOutMin, transactionSettings, router, path, deadline);
    
    const receiptData = await logReceipt(result.receipt, provider, result.transaction);
    console.log('receiptData: ', receiptData);
  }catch (err) {
    console.log(err);
  }
}

sell();