const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent } = require('@uniswap/sdk');
const ethers = require('ethers');
const web3 = require('web3');
const Web3Utils = require('web3-utils');

const chainId = ChainId.MAINNET;
const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const init = async () => {
  const dai = await Fetcher.fetchTokenData(chainId, tokenAddress); //you can change the network by passing it an ether.js provider
  const weth = WETH[chainId];
  //create a pair object to interact with a specific market
  const pair = await Fetcher.fetchPairData(dai, weth); //order doesn't matter
  const route = new Route([pair], weth);  //2nd param (weth) is the input token
  //number of dai tokens for 1 weth
  console.log('midPrice: ', route.midPrice.toSignificant(6)); //uses jsbi to manipulate bignumber, 6 is the number of digits, this is a string
  
  //inverted price 1 dai for x ether
  //midPrice is a theoretical price, you won't actually get this when u buy/sell
  console.log('midPrice inverted: ', route.midPrice.invert().toSignificant(6));

  //we want to put in 100 weth, and get out as much possible dai
  //this does not execute the trade, it only gets the data for what the execution price would be for the input amount
  //get the execution price, what you actually get it at
  const trade = new Trade(route, new TokenAmount(weth, '100000000000000000'), TradeType.EXACT_INPUT);
  console.log('executionPrice: ', trade.executionPrice.toSignificant(6));
  console.log('nextMidPrice: ', trade.nextMidPrice.toSignificant(6));
  
  // const slippageTolerance = new Percent('50', '10000') //this is how tyou do less than 1% ... 50 bips, 1 bip = 0.001%  so 50 = 0.050%
  const slippageTolerance = new Percent('1', '100') // this is 1%
  const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;  //raw format is string
  const path = [weth.address, dai.address];
  const to = '0xf5328ce7B39405eDBBa727f2fB1483F5d0b9ed16'; //recipient address, should be checksummed
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;  //20 is the number of minutes
  console.log('calc value');
  const value = trade.inputAmount.raw;  //amount of ether we want to use
  // const value = ethers.utils.parseEther('0.001', 18)
  // const value = trade.inputAmount;
  console.log('value: ', value);
  // const ether = ethers.utils.formatEther(value);
  // console.log('ether: ', ether);

  // const bigNumber = ethers.utils.bigNumber.from('42');
  // console.log('bn: ', bigNumber);
  // const hex = ethers.BigNumber.from(value.toString()).toHexString();
  // console.log('hex: ', hex);
  // const value = ethers.utils.parseUnits(trade.inputAmount.raw, 'ether');  //amount of ether we want to use
  // const value = ethers.utils.parseUnits('0.001', 'ether');
  // console.log('val: ', value.toString());
  console.log('set provider');
  //now create the transaction using ethers
  //uniswap only allows you to READ data, but not to send transactions
  const provider = ethers.getDefaultProvider('mainnet', {
    infura: 'https://mainnet.infura.io/v3/96198daafdb94c2bab7b50a2f3f73d60'
  })

  const signer = new ethers.Wallet('0231d9de27c0908d509db3a1e1504c75bd042a583996b6858b29636ed76c9e0f');
  const account = signer.connect(provider);

  console.log('set up uniswap router contract');
  //set up the uniswap router contract
  const uniswap = new ethers.Contract(
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
    account
  );

  console.log('set up txn');
  //send the transaction
  // const amnt = web3.utils.toWei('0.001', 'ether');
  // console.log('amnt: ', amnt);
  // const big = new web3.utils.BN(amnt);
  // console.log('big: ', big);
  
  // const amount2 = 1;
  // const big2 = web3.utils.toWei(amount2.toString(), 'ether');
  // const big3 = web3.utils.toBN(big2);
  // console.log('big3: ', big3.toString());
  // console.log(web3.utils.isBN(big3));
  // const toHex = '0x' + amount2.toString(16);
  // console.log('toHex: ', toHex);
  // const value2 = web3.utils.toWei('1000000000');
  // console.log('value2: ', value2);
  // const amount2 = '0.001';
  // const val = web3.utils.toWei(amount2, "ether");
  console.log('out: ', amountOutMin);
  // const outBig = ethers.utils.bigNumber.from('1');
  const outBig = new web3.utils.BN('1');
  console.log(web3.utils.isBN(outBig));
  const tx = await uniswap.swapExactETHForTokens(
    // amountOutMin,
    amountOutMin.toString(),
    // outBig,
    path,
    to,
    deadline,
    {
      value: Web3Utils.toWei('0.01', 'Ether'),
      gasLimit: 8000000, 
      gasPrice: Web3Utils.toWei('50', 'Gwei')
    }
  )

  console.log('transaction ok')
  

  //at this point the tx has not been mined, it's only been sent to the network
  console.log(`Transaction hash: ${tx.hash}`)

  //wait for it be mined, then we get the receipt
  const receipt = await tx.wait();

  console.log(`Transaction was mined in block ${receipt.blockNumber}`);
}

init();