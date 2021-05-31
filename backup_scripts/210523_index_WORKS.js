const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const web3 = require('web3');
const Web3Utils = require('web3-utils');
const moment = require('moment');
const addresses = require('./addresses');
const params = require('./params');

// console.log('NETWORK_ENV: ', process.env.NETWORK);

let config;
let settings;
switch(process.env.NETWORK) {
  case 'ROPSTEN':
    config = addresses.ropsten;
    settings = params.ropsten;
    settings.sellEth = params.sellEth;
    break;
  case 'MAINNET':
    config = addresses.mainnet;
    break;
  default:
    config = addresses.ropsten;
    break;
}

const setup = async () => {
  console.log('UNIBOT START');
  console.log('NETWORK_ENV: ', process.env.NETWORK);
  console.log('Chain id: ', config.chainId);
  console.log('Network: ', config.network);
}

let txInProgress = false;
const init = async () => {
  txInProgress = true;
  await setup();
  console.log('Using Default Provider (not Infura)');
  const provider = ethers.getDefaultProvider(config.network);
  
  const wethToken = WETH[config.chainId];  
  const daiToken = await Fetcher.fetchTokenData(config.chainId, config.dai); //you can change the network by passing it an ether.js provider
  
  console.log('DAI: ', daiToken.address);
  console.log('WETH: ', wethToken.address);

  const signer = new ethers.Wallet(config.privateKey);
  const account = signer.connect(provider);
  
  const daiContract = new ethers.Contract(
    config.dai,
    [
      'function balanceOf(address _owner) public view returns (uint balance)',
      'function approve(address spender, uint value) public returns(bool)'
    ],      
    account
  );

  console.log('DAI Contract: ', daiContract.address);
  
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

  let tokenIn;
  let tokenOut;
  let amountTokensIn;
  if(settings.sellEth){
    console.log('--------');
    console.log('SWAP ETH FOR DAI');
    tokenIn = wethToken;
    tokenOut = daiToken;
    amountTokensIn = settings.tokensInETH;
  }else {
    console.log('--------');
    console.log('SWAP DAI FOR ETH');
    tokenIn = daiToken;
    tokenOut = wethToken;
    amountTokensIn = settings.tokensInDAI;
  }

  const pair = await Fetcher.fetchPairData(
    tokenOut, 
    tokenIn,
    provider
  ); //order doesn't matter

  const route = new Route([pair], tokenIn);  //2nd param (weth) is the input token

  let valueWei = Web3Utils.toWei(amountTokensIn, 'Ether');
  valueWei = valueWei.toString();
  const valueEth = Web3Utils.fromWei(valueWei, 'Ether');
  
  const trade = new Trade(route, new TokenAmount(
    tokenIn,
    valueWei
  ), TradeType.EXACT_INPUT);

  console.log('------');
  console.log('Trade Execution Price: ');
  if(settings.sellEth){
    console.log(trade.executionPrice.toSignificant(6), ' ', tokenOut.address, ' per WETH', tokenIn.address);
  }else {
    console.log(trade.executionPrice.toSignificant(6), ' WETH per ', tokenIn.address);
  }
  console.log('---------');

  const path = [
    tokenIn.address, 
    tokenOut.address
  ];

  const wallet = config.wallet;

  const balanceWei = await provider.getBalance(wallet);
  const balanceEth = Web3Utils.fromWei(balanceWei.toString(), 'Ether');
  console.log(`Wallet ETH Balance: ${balanceEth.toString()}`);

  // console.log('daiContract: ', daiContract);
  let balanceDai = await daiContract.balanceOf(wallet);
  console.log('Wallet DAI Balance: ', balanceDai.toString());

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
  
  let value = Web3Utils.toWei(amountTokensIn.toString(), 'Ether');
  
  value = value.toString();
  
  const transactionSettings = {
    gasLimit: gasLimit,
    value: value,
    gasPrice: gasPrice
  }

  const slippageTolerance = new Percent(settings.slippage, '100');
  const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
  
  const amountOutMinWei = trade.minimumAmountOut(slippageTolerance).raw;  //raw format is string
  const amountOutMinEther = Web3Utils.fromWei(amountOutMinWei.toString(), 'Ether');

  const amountOutMin = ethers.utils.parseUnits(Web3Utils.fromWei(amountOutMinWei.toString()), 18);
  
  const minutes = 5;
  const deadline = Math.floor(Date.now() / 1000) + 60 * minutes;  //20 is the number of minutes

  console.log('------------');
  console.log('Submit Swap Transaction');

  if(settings.sellEth){
    console.log('SELL ETH');
    try {
      const tx = await uniswapRouter.swapExactETHForTokens(
        amountOutMin,
        path,
        wallet,
        deadline,
        transactionSettings
      )
      
      console.log('tx: ', tx);
      console.log(`Transaction hash: ${tx.hash}`)
    
      const receipt = await tx.wait();
      console.log(`Transaction was mined in block ${receipt.blockNumber}`);

    } catch(err) {
      console.log('----transaction failed');
      console.log(err);
    }
    
  }else {
    console.log('SELL DAI');
    try {
      let tokenIn = daiToken;
      let tokenOut = wethToken;

      console.log('amountTokensIn: ', amountTokensIn);

      const amountIn = ethers.utils.parseUnits(amountTokensIn, 'ether');
      console.log('amountIn: ', amountIn.toString());

      const trade = new Trade(route, new TokenAmount(
        tokenIn,
        amountIn
      ), TradeType.EXACT_INPUT);

      const slippageTolerance = new Percent(settings.slippage, '100');
      const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
      console.log('Slippage: ', slippage);

      const amountWithSlippage = trade.minimumAmountOut(slippageTolerance).raw; 
      console.log('amountWithSlippage: ', amountWithSlippage.toString());
      const amountOutMin = ethers.utils.parseUnits(amountWithSlippage.toString(), 0);
      
      console.log('amountOutMin: ', amountOutMin.toString());

      console.log(`
        Buying new token
        =================
        tokenIn: ${amountIn.toString()} ${tokenIn.address} 
        tokenOut: ${amountOutMin.toString()} ${tokenOut.address} (WETH)
      `);

      const txApprove = await daiContract.approve(
        config.uniswapRouter, 
        amountIn,
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )

      console.log('Approved Nonce: ', txApprove.nonce);

      const deadline = Date.now() + 1000 * 60 * 10;

      const tx = await uniswapRouter.swapExactTokensForETH(
        amountIn,
        amountOutMin,
        [tokenIn.address, tokenOut.address],
        wallet,
        deadline, //ten minutes
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )
  
      console.log('Submit Transaction Nonce: ', tx.nonce);
  
      const receipt = await tx.wait(
        txApprove,
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      );
  
      console.log('Receipt Transaction Hash: ', receipt.transactionHash);

    } catch (error) {
      // console.log('ERRRRRRRRR: ', error);
      console.log('------------ Transaction Failed, possible nonce issue');
    }

  }

  txInProgress = false;
    
}



const swapTokens = setInterval(async () => {
  // await monitorPrice();
  // console.log('Start Loop');
  if(txInProgress){
    // console.log('txnInProgress');
    return
  }else{
    console.log('')
    await init();
  }
}, 5000);