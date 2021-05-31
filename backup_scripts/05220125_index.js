const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const web3 = require('web3');
const Web3Utils = require('web3-utils');
const moment = require('moment');
const addresses = require('./addresses');
const params = require('./params');

console.log('NETWORK_ENV: ', process.env.NETWORK);

let config;
let settings;
switch(process.env.NETWORK) {
  case 'ROPSTEN':
    config = addresses.ropsten;
    settings = params.ropsten;
    break;
  case 'MAINNET':
    config = addresses.mainnet;
    break;
  default:
    config = addresses.ropsten;
    break;
}

const tradeDAI = awync () => {
  const chainId = config.chainId;
  console.log('chainId: ', chainId);
}

const tradeETH = async () => {

  const chainId = config.chainId;
  console.log('chainId: ', chainId);
  const daiAddress = config.dai;
  const network = config.network;
  console.log('Network: ', network);
  // console.log('infura: ', config.infuraWebsocket);
  console.log('Default Provider');
  const provider = ethers.getDefaultProvider(network);
  const daiToken = await Fetcher.fetchTokenData(
    chainId, 
    config.dai
  ); //you can change the network by passing it an ether.js provider
  
  console.log('DAI: ', daiToken.address);
  
  // console.log('dai: ', dai);
  // console.log('chainId: ', chainId);
  const wethToken = WETH[chainId];
  // console.log('weth: ', weth);
  // const wethAddress = wethToken.address;
  console.log('WETH: ', wethToken.address);

  const pair = await Fetcher.fetchPairData(
    daiToken, 
    wethToken,
    provider
  ); //order doesn't matter

  const route = new Route([pair], wethToken);  //2nd param (weth) is the input token
  
  const signer = new ethers.Wallet(config.privateKey);
  const account = signer.connect(provider);
  //set up the uniswap router contract
  const uniswap = new ethers.Contract(
    config.uniswapRouter,
    ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
    account
  );
  console.log('UniswapV2 Router: ', uniswap.address);

  const tokensInSetting = settings.tokensInETH; //eth
  let value = Web3Utils.toWei(tokensInSetting, 'Ether');
  value = value.toString();
  const valueEth = Web3Utils.fromWei(value, 'Ether');
  
  const trade = new Trade(route, new TokenAmount(
    wethToken, 
    value
  ), TradeType.EXACT_INPUT);

  console.log('------');
  console.log('Trade Execution Price: ');
  console.log(trade.executionPrice.toSignificant(6), 'DAI per ETH');
  console.log('Next Price: ');
  console.log(trade.nextMidPrice.toSignificant(6), 'DAI per ETH');
  console.log('---------');
  const path = [wethToken.address, daiToken.address];
  const wallet = config.wallet;

  let balance = await provider.getBalance(wallet);
  balance = Web3Utils.fromWei(balance.toString(), 'Ether');
  console.log(`Wallet Balance: ${balance.toString()} ETH`);

  let gasEstimateWei = await provider.getGasPrice();
  gasEstimateWei = parseInt(gasEstimateWei);
  const gasEstimateGwei = Web3Utils.fromWei(gasEstimateWei.toString(), 'Gwei');
  console.log('Gas Estimate: ', gasEstimateGwei, 'Gwei');
  console.log('Additional Gas Gwei: ', settings.additionalGas);
  const additionalGasSetting = Web3Utils.toWei(settings.additionalGas, 'Gwei')
  const additionalGasWei = parseInt(additionalGasSetting);
  const gasPrice = gasEstimateWei + additionalGasWei;
  const gasPriceGwei = Web3Utils.fromWei(gasPrice.toString(), 'Gwei')
  console.log('Gas Used Gwei: ', gasPriceGwei);
  const gasLimit = settings.gasLimit;
  console.log('Gas Limit: ', gasLimit);
  const transactionSettings = {
    gasLimit: gasLimit,
    value: value,
    gasPrice: gasPrice
  }

  const slippageTolerance = new Percent(settings.slippage, '100');
  const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
  console.log('Slippage: ', slippage, 'percent');
  const amountOutMinWei = trade.minimumAmountOut(slippageTolerance).raw;  //raw format is string
  const amountOutMinEther = Web3Utils.fromWei(amountOutMinWei.toString(), 'Ether');
  
  console.log('AMOUNT IN: ', valueEth, 'ETH');
  console.log('AMOUNT OUT: ', amountOutMinEther, 'DAI?')
  
  const amountOutMin = ethers.utils.parseUnits(Web3Utils.fromWei(amountOutMinWei.toString()), 18);
  
  const minutes = 5;
  const deadline = Math.floor(Date.now() / 1000) + 60 * minutes;  //20 is the number of minutes
  const validTill = moment.unix(deadline).format('h:mm:ss A');
  console.log('Transaction Valid for: ', minutes, 'mins', validTill);

  console.log('------------');
  console.log('Swap ETH for DAI');
  const tx = await uniswap.swapExactETHForTokens(
    amountOutMin,
    path,
    wallet,
    deadline,
    transactionSettings
  )
  console.log('transaction ok')
  console.log('tx: ', tx);

  //at this point the tx has not been mined, it's only been sent to the network
  console.log(`Transaction hash: ${tx.hash}`)

  //wait for it be mined, then we get the receipt
  const receipt = await tx.wait();
  console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    
}



// tradeETH();
tradeDAI();