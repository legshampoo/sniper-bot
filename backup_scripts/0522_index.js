const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const web3 = require('web3');
const Web3Utils = require('web3-utils');
const moment = require('moment');
const addresses = require('./addresses');
const settings = require('./settings');

console.log('NETWORK: ', process.env.NETWORK);

let config;
switch(process.env.NETWORK) {
  case 'ROPSTEN':
    config = addresses.ropsten;
    break;
  case 'MAINNET':
    config = addresses.mainnet;
    break;
  default:
    config = addresses.mainnet;
    break;
}

const init = async () => {

  const chainId = config.chainId;
  const daiAddress = config.dai;
  console.log('infura: ', config.infuraWebsocket);
  const network = config.network;
  const provider = ethers.getDefaultProvider(network);
  // console.log('provider: ', provider.providerConfigs);
  console.log('chainId: ', chainId);
  const dai = await Fetcher.fetchTokenData(
    chainId, 
    daiAddress
  ); //you can change the network by passing it an ether.js provider
  
  console.log('dai: ', dai);
  console.log('chainId: ', chainId);
  const weth = WETH[chainId];
  console.log('weth: ', weth);
  console.log('daiAddress: ', daiAddress);
  const wethAddress = weth.address;
  console.log('wethAddress: ', wethAddress);

  //create a pair object to interact with a specific market
  const pair = await Fetcher.fetchPairData(
    dai, 
    weth,
    provider
  ); //order doesn't matter

  // console.log('currency address: ', pair.tokenAmounts[0].currency.address);
  // console.log('tokenA: ', pair.tokenAmounts[0]);
  // console.log('currency: ', pair.tokenAmounts.token);

  const route = new Route([pair], weth);  //2nd param (weth) is the input token
  //number of dai tokens for 1 weth
  console.log('midPrice: ', route.midPrice.toSignificant(6), 'DAI for 1 ETH'); //uses jsbi to manipulate bignumber, 6 is the number of digits, this is a string
  
  //inverted price 1 dai for x ether
  //midPrice is a theoretical price, you won't actually get this when u buy/sell
  console.log('midPrice inverted: ', route.midPrice.invert().toSignificant(6), 'ETH for 1 DAI');

  //we want to put in 100 weth, and get out as much possible dai
  //this does not execute the trade, it only gets the data for what the execution price would be for the input amount
  //get the execution price, what you actually get it at
  // const trade = new Trade(route, new TokenAmount(weth, '100000000000000000'), TradeType.EXACT_INPUT);
  const tokensInSetting = '0.00001'; //eth
  let value = Web3Utils.toWei(tokensInSetting, 'Ether');
  value = value.toString();
  const valueEth = Web3Utils.fromWei(value, 'Ether');
  console.log('AMOUNT IN: ', valueEth, 'ETH');
  // const tradeAmount = '0.000025';
  // console.log('tradeAmount: ', tradeAmount);
  // const value = Web3Utils.toWei(tokensInSetting, 'Ether');
  // console.log('weiAmount: ', weiAmount);
  // const ethAmount = Web3Utils.fromWei(weiAmount, 'Ether');
  // console.log(`Amount: ${ethAmount} ETH, ${weiAmount} Wei`);
  
  const trade = new Trade(route, new TokenAmount(weth, value), TradeType.EXACT_INPUT);
  console.log('executionPrice: ', trade.executionPrice.toSignificant(6));
  console.log('nextMidPrice: ', trade.nextMidPrice.toSignificant(6));
  
  // // const slippageTolerance = new Percent('50', '10000') //this is how tyou do less than 1% ... 50 bips, 1 bip = 0.001%  so 50 = 0.050%
  // const slippageTolerance = new Percent('1', '100');
  // console.log('slippageTolerance: ', slippageTolerance);
   // this is 1%
  //  console.log('TRADE: ', trade);
  // const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;  //raw format is string
  // console.log('amntout: ', amountOutMin.toString());
  const path = [weth.address, dai.address];
  const wallet = config.wallet;

  // console.log('web3: ', web3);
  let balance = await provider.getBalance(wallet);
  balance = Web3Utils.fromWei(balance.toString(), 'Ether');
  console.log(`Wallet Balance: ${balance.toString()} ETH`);
  // const accounts = await web3.eth.getAccounts();
  // console.log('accounts: ', accounts);
  // const bal = await web3.eth.getBalance(wallet);
  // console.log('bal: ', bal);
  
  const signer = new ethers.Wallet(config.privateKey);
  const account = signer.connect(provider);
  
  //set up the uniswap router contract
  const uniswap = new ethers.Contract(
    config.uniswapRouter,
    ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
    account
    );
    
  
  
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

  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;  //raw format is string
  const amountOutMinEther = Web3Utils.fromWei(amountOutMin.toString(), 'Ether');
  console.log('amountOutMinEther: ', amountOutMinEther, 'ETH')
  const amountOutMinSetting = ethers.utils.parseUnits(Web3Utils.fromWei(amountOutMin.toString()), 18);
  
  const minutes = 5;
  const deadline = Math.floor(Date.now() / 1000) + 60 * minutes;  //20 is the number of minutes
  const validTill = moment.unix(deadline).format('h:mm:ss A');
  console.log('Valid for: ', minutes, 'mins', validTill);
  
  const tx = await uniswap.swapExactETHForTokens(
    amountOutMinSetting,
    path,
    wallet,
    deadline,
    transactionSettings
  )

  console.log('transaction ok')
  console.log('tx: ', tx);
  // console.log('Nonce: ', tx.nonce)
  // console.log('Gas Price: ', tx.gasPrice);

  //at this point the tx has not been mined, it's only been sent to the network
  console.log(`Transaction hash: ${tx.hash}`)

  //wait for it be mined, then we get the receipt
  const receipt = await tx.wait();

  console.log(`Transaction was mined in block ${receipt.blockNumber}`);
}

init();