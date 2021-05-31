const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const { DateTime } = require('luxon');
const addresses = require('../config/addresses');
const params = require('../config/params');
const Web3Utils = require('web3-utils');
// const listenDebug = require('./listenDebug');

console.log('Starting PairCreated Listener');

let config;
let settings;
switch(process.env.NETWORK) {
  case 'ROPSTEN':
    // config = addresses.ropsten;
    // settings = params.ropsten;
    break;
  case 'MAINNET':
    config = addresses.mainnet;
    settings = params.listener;
    break;
  default:
    config = addresses.listen;
    break;
}

console.log('Network: ', config.network);
const provider = ethers.getDefaultProvider(config.network);
// console.log('provider: ', provider);
const signer = new ethers.Wallet(config.privateKey);

const account = signer.connect(provider);

const factory = new ethers.Contract(
  config.uniswapFactory,  //the factory of uniswap
  ['event PairCreated(address indexed token0, address indexed token1, address pair, uint)'],  //this is the abi.  ethers has a featur 'human readable abi' so you can just write it out.  here we just put the parts we are interested in, but there is much more in the abi
  account  //address we use to sign transaction
);

console.log('Uniswap Factory: ', factory.address);

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

console.log('Uniswap Router: ', router.address);
// const now = moment();
// console.log('now: ', now.format());

/*
  New pair detected
    =================
    token0: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    token1: 0xD6742251EC17D744fC9A8EA3E1b6a4fE392C42f8
    pairAddress: 0x899383De55e2F302Ef02668a42c09842E269DcBd
*/
// const testMode = true;

const listenDebug = async () => {
  console.log('-'.repeat(100));
  const now = DateTime.now();
  console.log(now.toLocaleString(DateTime.DATETIME_MED));
  console.log('Test Mode - New Pair Created');

  const token0 = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const token1 = '0xD6742251EC17D744fC9A8EA3E1b6a4fE392C42f8';
  const pairAddress = '0x899383De55e2F302Ef02668a42c09842E269DcBd';
  // let tokenIn = token0;
  // let tokenOut = token1;

  const tokenIn = await Fetcher.fetchTokenData(config.chainId, token0);
  const tokenOut = await Fetcher.fetchTokenData(config.chainId, token1);

  // console.log('tokenIn: ', tokenIn);
  // console.log('tokenOut: ', tokenOut);

  const tokenInContract = new ethers.Contract(
    tokenIn.address,
    [
      'function balanceOf(address _owner) public view returns (uint balance)',
      'function approve(address spender, uint value) public returns(bool)'
    ],      
    account
  );
  console.log('tokenInContract: ', tokenInContract.address);

  const tokenOutContract = new ethers.Contract(
    tokenOut.address,
    [
      'function balanceOf(address _owner) public view returns (uint balance)',
      'function approve(address spender, uint value) public returns(bool)'
    ],      
    account
  );

  console.log('tokenOutContract: ', tokenOutContract.address);

  const pair = await Fetcher.fetchPairData(
    tokenOut, 
    tokenIn,
    provider
  ); //order doesn't matter


  // console.log('pair: ', pair);
  // const reserveOfTokenIn = await pair.reserveOf(tokenIn);
  // const reserveOfTokenOut = await pair.reserveOf(tokenOut);
  // console.log('reserveOfTokenIn num: ', reserveOfTokenIn.numerator.toString());
  // console.log('reserveOfTokenIn den: ', reserveOfTokenIn.denominator.toString());
  // const ethReserve = web3.eth.getBalance(exchangeAddress)
  const ethReserve = await provider.getBalance(pairAddress);
  console.log('ethReserver: ', ethReserve);

  const liquidity = await pair.getLiquidityMinted();
  console.log('liquidity: ', liquidity);
  console.log('reserveOfTokenOut num: ', reserveOfTokenOut.numerator.toString());
  console.log('reserveOfTokenOut den: ', reserveOfTokenOut.denominator.toString());
  const route = new Route([pair], tokenIn);  //2nd param (weth) is the input token
  const amountTokensIn = settings.tokensInETH;
  console.log('amountTokensIn: ', amountTokensIn);
  const amountIn = ethers.utils.parseUnits(amountTokensIn.toString(), 'ether');
  console.log(amountIn.toString());
  
  const trade = new Trade(route, new TokenAmount(
    tokenIn,
    amountIn
  ), TradeType.EXACT_INPUT);

  // console.log('Trade: ', trade);

  console.log('Trade Execution Price: ');
  console.log(trade.executionPrice.toSignificant(6), ' tokenOut:', tokenOut.address, ' per tokenIn', tokenIn.address);

  const path = [
    tokenIn.address, 
    tokenOut.address
  ];

  console.log('path: ', path);

  let gasEstimate = await provider.getGasPrice();
  const additionalGas = Web3Utils.toWei(settings.additionalGas, 'Gwei')
  const gasPrice = parseInt(gasEstimate) + parseInt(additionalGas);

  console.log('Gas Estimate: ', gasEstimate.toString());
  console.log('Additional Gas: ', additionalGas);
  console.log('Using Gas Price: ', gasPrice);

  let transactionSettings = {
    gasLimit: settings.gasLimit,
    gasPrice: gasPrice
  }

  const slippageTolerance = new Percent(settings.slippage, '100');
  const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
  console.log('Slippage: ', slippage, '%');

  const amountWithSlippage = trade.minimumAmountOut(slippageTolerance).raw; 
  // console.log('amountWithSlippage: ', amountWithSlippage.toString());
  const amountOutMin = ethers.utils.parseUnits(amountWithSlippage.toString(), 0);
  
  // console.log('amountIn: ', ethers.utils.parseUnits(amountIn.toString(), 0).toString());
  console.log('amountIn: ', Web3Utils.fromWei(amountIn.toString(), 'Ether'), 'tokenIn: ', tokenIn.address)
  console.log('amountOut: ', Web3Utils.fromWei(amountOutMin.toString(), 'Ether'), 'tokenOut: ', tokenOut.address);
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * settings.deadlineMinutes;  //20 is the number of minutes
  
  console.log('-- Begin Transaction --');

  console.log('Trading ETH for Tokens');
  try {
    // console.log('amountIn: ', amountIn);
    transactionSettings.value = amountIn;
    const tx = await router.swapExactETHForTokens(
      amountOutMin,
      path,
      config.wallet,
      deadline,
      transactionSettings
    )
    
    console.log('tx: ', tx);
    console.log(`Transaction hash: ${tx.hash}`)
    
    if(settings.enableTrading){
      const receipt = await tx.wait();
      console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    }else {
      console.log('Trading is disabled, transaction not submitted');
    }
  } catch(err) {
    // console.log('Transaction Error, possible nonce issue');
    console.log(err);
  }
  
  const done = DateTime.now();
  console.log('Process Complete');
  console.log(done.toLocaleString(DateTime.DATETIME_MED));
  console.log('-'.repeat(100));
}

const listen = async () => {
  factory.on('PairCreated', async (token0, token1, pairAddress) => {
    console.log('-'.repeat(100));
    const now = DateTime.now();
    console.log(now.toLocaleString(DateTime.DATETIME_MED));
    
    console.log(`
      New pair detected
      =================
      token0: ${token0}
      token1: ${token1}
      pairAddress: ${pairAddress}
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
    console.log('tokenInContract: ', tokenInContract.address);

    const tokenOutContract = new ethers.Contract(
      tokenOut.address,
      [
        'function balanceOf(address _owner) public view returns (uint balance)',
        'function approve(address spender, uint value) public returns(bool)'
      ],      
      account
    );

    console.log('tokenOutContract: ', tokenOutContract.address);

    const pair = await Fetcher.fetchPairData(
      tokenOut, 
      tokenIn,
      provider
    ); //order doesn't matter
    // console.log('pair: ', pair);
    const route = new Route([pair], tokenIn);  //2nd param (weth) is the input token
    const amountTokensIn = settings.tokensInETH;
    console.log('amountTokensIn: ', amountTokensIn);
    const amountIn = ethers.utils.parseUnits(amountTokensIn.toString(), 'ether');
    console.log(amountIn.toString());
    
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

    console.log('path: ', path);

    let gasEstimate = await provider.getGasPrice();
    const additionalGas = Web3Utils.toWei(settings.additionalGas, 'Gwei')
    const gasPrice = parseInt(gasEstimate) + parseInt(additionalGas);

    console.log('Gas Estimate: ', gasEstimate.toString());
    console.log('Additional Gas: ', additionalGas);
    console.log('Using Gas Price: ', gasPrice);

    let transactionSettings = {
      gasLimit: settings.gasLimit,
      gasPrice: gasPrice
    }

    const slippageTolerance = new Percent(settings.slippage, '100');
    const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
    console.log('Slippage: ', slippage, '%');

    const amountWithSlippage = trade.minimumAmountOut(slippageTolerance).raw; 
    // console.log('amountWithSlippage: ', amountWithSlippage.toString());
    const amountOutMin = ethers.utils.parseUnits(amountWithSlippage.toString(), 0);
    
    // console.log('amountIn: ', ethers.utils.parseUnits(amountIn.toString(), 0).toString());
    console.log('amountIn: ', Web3Utils.fromWei(amountIn.toString(), 'Ether'), 'tokenIn: ', tokenIn.address)
    console.log('amountOut: ', Web3Utils.fromWei(amountOutMin.toString(), 'Ether'), 'tokenOut: ', tokenOut.address);
    
    const deadline = Math.floor(Date.now() / 1000) + 60 * settings.deadlineMinutes;  //20 is the number of minutes
    
    console.log('-- Begin Transaction --');

    console.log('Trading ETH for Tokens');
    try {
      // console.log('amountIn: ', amountIn);
      transactionSettings.value = amountIn;
      const tx = await router.swapExactETHForTokens(
        amountOutMin,
        path,
        config.wallet,
        deadline,
        transactionSettings
      )
      
      console.log('tx: ', tx);
      console.log(`Transaction hash: ${tx.hash}`)
      
      if(settings.enableTrading){
        const receipt = await tx.wait();
        console.log(`Transaction was mined in block ${receipt.blockNumber}`);
      }else {
        console.log('---------- TRADING IS DISABLED, transaction not submitted');
      }
    } catch(err) {
      // console.log('Transaction Error, possible nonce issue');
      console.log(err);
    }
    
    const done = DateTime.now();
    console.log('Process Complete');
    console.log(done.toLocaleString(DateTime.DATETIME_MED));
    console.log('-'.repeat(100));
  });
  console.log('-'.repeat(100));
  console.log('PairCreated Listener Started');
  console.log('-'.repeat(100));
}

if(settings.testMode){
  console.log('TEST MODE');
  listenDebug();
}else {
  console.log('LIVE MODE');
  listen();
}
