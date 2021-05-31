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
  console.log('Sell ETH: ', settings.sellEth);
}


const init = async () => {
  await setup();
  // const chainId = config.chainId;
  // console.log('chainId: ', chainId);
  // const daiAddress = config.dai;
  // const network = config.network;
  // console.log('Network: ', network);
  // console.log('infura: ', config.infuraWebsocket);
  console.log('Using Default Provider (not Infura)');
  const provider = ethers.getDefaultProvider(config.network);
  const wethToken = WETH[config.chainId];
  console.log('WETH Token: ', wethToken);
  
  const daiToken = await Fetcher.fetchTokenData(
    config.chainId, 
    config.dai
  ); //you can change the network by passing it an ether.js provider
  console.log('DAI Token: ', daiToken);
  console.log('DAI: ', daiToken.address);
  console.log('WETH: ', wethToken.address);

  // const pair = await Fetcher.fetchPairData(
  //   daiToken, 
  //   wethToken,
  //   provider
  // ); //order doesn't matter

  const signer = new ethers.Wallet(config.privateKey);
  // console.log('signer: ', signer.address);
  const account = signer.connect(provider);

  // console.log('account: ', account.address);
  
  //for checking wallet dai balance
  const daiContract = new ethers.Contract(
    config.dai,
    ['function balanceOf(address _owner) public view returns (uint balance)'],
    account
  );
  
  const uniswapRouter = new ethers.Contract(
    config.uniswapRouter,
    [
      'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts)'
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

  console.log('Token IN: ', tokenIn);
  console.log('AMMMMOUNT: ', amountTokensIn);
  const pair = await Fetcher.fetchPairData(
    tokenOut, 
    tokenIn,
    provider
  ); //order doesn't matter

  // const route = new Route([pair], wethToken);  //2nd param (weth) is the input token
  const route = new Route([pair], tokenIn);  //2nd param (weth) is the input token

  console.log('amount tokens in: ', amountTokensIn);
  let valueWei = Web3Utils.toWei(amountTokensIn, 'Ether');
  console.log('value wei is bn: ', web3.utils.isBN(valueWei));
  valueWei = valueWei.toString();
  const valueEth = Web3Utils.fromWei(valueWei, 'Ether');
  console.log('AMOUNT IN: ', valueEth, 'in eth?');
  console.log('tooooken in: ', tokenIn);
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

  console.log('path: ', path);
  const wallet = config.wallet;

  const balanceWei = await provider.getBalance(wallet);
  const balanceEth = Web3Utils.fromWei(balanceWei.toString(), 'Ether');
  console.log(`Wallet ETH Balance: ${balanceEth.toString()}`);
  
  // const daiContract = new ethers.Contract(
  //   config.dai,
  //   [
  //     'function balanceOf(address _owner) public view returns (uint balance)'
  //   ],
  //   account
  // );

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
  
  // const tokensInSetting = '0.00001'; //eth
  // const amountTokensIn = config.tokensInETH.toString();
  console.log('amountTokensIn: ', amountTokensIn);
  console.log('first is bn: ', web3.utils.isBN(amountTokensIn));
  let value = Web3Utils.toWei(amountTokensIn.toString(), 'Ether');
  value = value.toString();

  const transactionSettings = {
    gasLimit: gasLimit,
    value: value,
    gasPrice: gasPrice
  }

  console.log('transactionSettings.value: ', transactionSettings.value);
  // console.log('Gas Price: ', transactionSettings.gasPrice);

  const slippageTolerance = new Percent(settings.slippage, '100');
  const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
  console.log('Slippage: ', slippage, 'percent');
  
  const amountOutMinWei = trade.minimumAmountOut(slippageTolerance).raw;  //raw format is string
  const amountOutMinEther = Web3Utils.fromWei(amountOutMinWei.toString(), 'Ether');
  
  // console.log('AMOUNT IN: ', valueEth, 'ETH');
  console.log('AMOUNT OUT: ', amountOutMinEther, 'of Token Out')
  
  const amountOutMin = ethers.utils.parseUnits(Web3Utils.fromWei(amountOutMinWei.toString()), 18);
  
  const minutes = 5;
  const deadline = Math.floor(Date.now() / 1000) + 60 * minutes;  //20 is the number of minutes
  const validTill = moment.unix(deadline).format('h:mm:ss A');
  console.log('Transaction Valid for: ', minutes, 'mins', validTill);

  console.log('------------');
  console.log('Submit Swap Transaction');
  if(settings.sellEth){
  // if(true){
    console.log('SELL ETH');
    const tx = await uniswapRouter.swapExactETHForTokens(
      amountOutMin,
      path,
      wallet,
      deadline,
      transactionSettings
    )
    
    // console.log('Transaction Ready:')
    console.log('tx: ', tx);
    console.log('gasLimit: ', tx.gasLimit.toString());
    console.log('gasPrice: ', tx.gasPrice.toString());
    console.log('Nonce: ', tx.nonce);
    console.log('Value: ', tx.value.toString());
  
    //at this point the tx has not been mined, it's only been sent to the network
    console.log(`Transaction hash: ${tx.hash}`)
  
    //wait for it be mined, then we get the receipt
    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    // return
    console.log('done');
  }else {
    console.log('SELL DAI');
    // let nonce = await provider.getTransactionCount(wallet);
    // nonce++;
    // console.log('new nonce: ', nonce);
    // const valueBigNumber = ethers.BigNumber.from(value.toString());
    const valueBigNumber = ethers.BigNumber.from(1);
    // const valueBigNumber = web3.utils.toBN(value);
    // console.log('valueBigNumber: ', valueBigNumber);
    // console.log('valueBigNumber is bn: ', web3.utils.isBN(valueBigNumber));
    // console.log('valueBigNumber is bn: ', ethers.BigNumber.isBigNumber(valueBigNumber));
    const amountOutMin = ethers.utils.parseUnits(Web3Utils.fromWei(amountOutMinWei.toString()), 18);
    // console.log('amoutOutMin going in: ', typeof amountOutMin);
    // const amnt = Web3Utils.toWei(amountOutMinWei.toString(), 'Wei')
    // console.log('amnt: ', typeof amnt);
    const amountInWei = web3.utils.toWei('0.0001');
    const amountIn = web3.utils.toBN(amountInWei);
    // console.log('amountIn: ', amountIn.toString());
    // console.log('typeof: ', typeof amountIn);
    // const amt = ethers.utils.parseUnits('10000', 18);
    // const amt = ethers.BigNumber.from(web3.utils.toWei('0.001'));
    // console.log('amountIn: ', amt.toString());
    // console.log('amountIn is big: ', ethers.BigNumber.isBigNumber(amt));
    // console.log('amountOutMin: ', amountOutMin.toString());
    // console.log('amountOutMin is big: ', ethers.BigNumber.isBigNumber(amountOutMin));
    // console.log('path: ', path);

    const amountInDai = web3.utils.toWei('0.1');
    // const amntIn = ethers.BigNumber.from(web3.utils.toWei('1'));
    // const amntOut = ethers.BigNumber.from(web3.utils.toWei('0.0000000000000001'));
    const amountsOut = await uniswapRouter.getAmountsOut(amountInDai, path);
    // console.log('amountsOut 0: ', amountsOut[0].toString());
    console.log('amountsOut 1: ', amountsOut[1].toString());
    const amountOutMin2 = amountsOut[1]
        .mul(90)
        .div(100)
        // .mul(web3.utils.toBN(90))
        // .div(web3.utils.toBN(100));
    console.log('amountOutMin2: ', amountOutMin2.toString());
    const amountInDaiBN = ethers.BigNumber.from(amountInDai);
    console.log('in: ', amountInDaiBN);

    // const tradeAmountOutMin = trade.minimumAmountOut(slippageTolerance).raw // needs to be converted to e.g. hex
    // console.log('tradeAmountOutMin: ', tradeAmountOutMin);
    const tradeVal = trade.inputAmount.raw;
    console.log('tradeVal: ', tradeVal.toString());
    const tx = await uniswapRouter.swapExactTokensForETH(
      // amt,
      // amountOutMin,
      // amountInDaiBN,
      ethers.BigNumber.from(tradeVal.toString()),
      // tradeVal,
      // tradeAmountOutMin,
      // amountOutMin2,
      ethers.BigNumber.from(100),
      // path,
      [
        wethToken.address,
        daiToken.address
      ],
      wallet,
      deadline,
      {
        // gasLimit: gasLimit,
        gasLimit: 1000000,
        gasPrice: gasPrice
      }
    )
    // const tx = await uniswapRouter.swapExactTokensForTokens(
    //   // amountOutMinWei,
    //   // value2,
    //   // amountIn,
    //   amt.toString(),
    //   amountOutMin,
    //   path,
    //   wallet,
    //   deadline,
    //   {
    //     // value: amt,
    //     // nonce: nonce,
    //     gasLimit: gasLimit,
    //     gasPrice: gasPrice
    //   }
    // )

    console.log(`Transaction hash: ${tx.hash}`)
    console.log('tx: ', tx);
    console.log('tx.nonce: ', tx.nonce);
    console.log('tx.value: ', tx.value.toString());
    console.log('tx.value is big: ', ethers.BigNumber.isBigNumber(tx.value));
    console.log('tx.gasLimit: ', tx.gasLimit.toString());
    console.log('tx.gasPrice: ', tx.gasPrice.toString());

    //wait for it be mined, then we get the receipt
    console.log('-------');
    console.log('submit transaction');
    const receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);

    console.log('ok');
    // return 
  }
    
}


init();