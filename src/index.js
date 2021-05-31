const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const web3 = require('web3');
const Web3Utils = require('web3-utils');
const moment = require('moment');
const environment = require('./environment');
const { sellToken, logReceipt } = require('./tradeHelpers');

const config = environment.config;
const settings = environment.settings;

const initLog = async () => {
  console.log('UNIBOT START');
  console.log('NETWORK_ENV: ', process.env.NETWORK);
  console.log('Chain id: ', config.chainId);
  console.log('Network: ', config.network);
  console.log('Using Default Provider (not Infura)');
}

let txInProgress = false;

const init = async () => {
  txInProgress = true;
  initLog();
  const provider = ethers.getDefaultProvider(config.network);

  const signer = new ethers.Wallet(config.privateKey);
  const account = signer.connect(provider);
  
  const uniswapRouter = new ethers.Contract(
    config.uniswapRouter,
    [
      'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts)',
    ],
    account
  );

  console.log('UniswapV2 Router: ', uniswapRouter.address);

  const wethToken = await Fetcher.fetchTokenData(config.chainId, config.weth);
  const daiToken = await Fetcher.fetchTokenData(config.chainId, config.dai); //you can change the network by passing it an ether.js provider

  let tokenIn;
  let tokenOut;
  let amountTokensIn;
  if(settings.sellEth){
    console.log('--------');
    console.log('Selling Eth');
    tokenIn = wethToken;
    tokenOut = daiToken;
    amountTokensIn = settings.tokensInETH;
  }else {
    console.log('--------');
    console.log('SWAP DAI FOR ETH');
    tokenIn = daiToken;
    tokenOut = wethToken;
    amountTokensIn = settings.numTokensToSell;
  }

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
    
  const amountIn = ethers.utils.parseUnits(amountTokensIn, 'ether');

  console.log('TOKEN IN: ', tokenIn);
  console.log('AMOUNT IN: ', amountIn.toString());

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
  console.log('Gas Limit: ', settings.gasLimit);
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
  const amountOutMin = ethers.utils.parseUnits(amountWithSlippage.toString(), 0);
  
  console.log('amountIn: ', Web3Utils.fromWei(amountIn.toString(), 'Ether'), 'tokenIn: ', tokenIn.address)
  console.log('amountOut: ', Web3Utils.fromWei(amountOutMin.toString(), 'Ether'), 'tokenOut: ', tokenOut.address);
  
  const deadline = Math.floor(Date.now() / 1000) + 60 * settings.deadlineMinutes;  //20 is the number of minutes
  
  console.log('-- Begin Transaction --');
  
  // const block = await provider.block.nonce();
  // console.log('block: ', block);
  if(settings.sellEth){
    console.log('ETH Transaction');
    try {
      transactionSettings.value = amountIn;
      const tx = await uniswapRouter.swapExactETHForTokens(
        amountOutMin,
        path,
        config.wallet,
        deadline,
        transactionSettings
      )
      
      console.log('tx: ', tx);
      console.log(`Transaction hash: ${tx.hash}`)
      
      const receipt = await tx.wait();
      console.log('receipt: ', receipt);
      console.log(`Transaction was mined in block ${receipt.blockNumber}`);
      console.log(`Gas Used: ${receipt.cumulativeGasUsed.toString()}`)
      txInProgress = false;
    } catch(err) {
      console.log('Transaction Error, possible nonce issue');
      console.log(err);
    }
  } else {
    console.log('DAI Transaction');
    const receipt = await sellToken(tokenInContract, amountIn, amountOutMin, transactionSettings, uniswapRouter, path, deadline);
    
    const receiptData = await logReceipt(receipt, provider, tx);
    console.log('receiptData: ', receiptData);
    
    txInProgress = false;
  }    
}

// init();
const swapTokens = setInterval(async () => {
  if(txInProgress){
    return
  }else{
    console.log('')
    await init();
  }
}, 5000);