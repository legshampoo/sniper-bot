const ethers = require('ethers');
const { Percent } = require('@uniswap/sdk');
const environment = require('./environment');
const {
  router
} = require('./setup');
const config = environment.config;
const settings = environment.settings;


const calculateAmountOutMin = async (trade) => {
  console.log('Calculate amountOutMin');

  const slippageTolerance = new Percent(settings.slippage, '100');
  const slippage = (slippageTolerance.numerator / slippageTolerance.denominator) * 100;
  console.log('Slippage: ', slippage, '%');

  const amountWithSlippage = trade.minimumAmountOut(slippageTolerance).raw; 
  const amountOutMin = ethers.utils.parseUnits(amountWithSlippage.toString(), 0);

  console.log('Amount Out Min: ', amountOutMin);
  // console.log('amountIn: ', Web3Utils.fromWei(amountIn.toString());
  // console.log('amountOut: ', Web3Utils.fromWei(amountOutMin.toString());

  return amountOutMin;
}
const buyToken = async (amountIn, amountOutMin, path, wallet, deadline, transactionSettings) => {
 console.log('swap ETH for Tokens');
 settings.value = amountIn;
 
 let receipt = {};
 if(settings.enableTrading){
  const txSettings = {
    value: amountIn,
    gasLimit: transactionSettings.gasLimit,
    gasPrice: transactionSettings.gasPrice
  }

  const tx = await router.swapExactETHForTokens(
    amountOutMin,
    path,
    wallet,
    deadline,
    txSettings
  )

    console.log('tx: ', tx);
    console.log(`Transaction hash: ${tx.hash}`) 

    receipt = await tx.wait();
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
  }else {
    receipt.status = 'Trading is disabled, no trade was executed';
  }
 
 return receipt
}

const sellToken = async (tokenIn, amountIn, amountOut, settings, router, path, deadline) => {
  console.log('Sell Token function');
  
  try {
    const txApprove = await tokenIn.approve(
        config.uniswapRouter, 
        amountIn,
        settings
      )
  
    console.log('Approve: ', txApprove);
    console.log('txApprove gasPrice: ', txApprove.gasPrice.toString())
    console.log('txApprove gasLimit: ', txApprove.gasLimit.toString())
  
    const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOut,
        path,
        config.wallet,
        deadline, 
        settings
      )
  
  
    console.log('tx: ', tx);
    console.log('txn gasPrice: ', tx.gasPrice.toString())
    console.log('txn gasLimit: ', tx.gasLimit.toString())
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Awaiting receipt...')
    const receipt = await tx.wait(
        txApprove,
        settings
      );

    const result = {
      transaction: tx,
      receipt: receipt
    }
    
    return result;
  }catch (err) {
    console.log(err);
    return err
  }
  
}

const logReceipt = async (receipt, provider, tx) => {
  try {
    console.log('receipt: ', receipt);
    console.log('Gas Used: ', receipt.gasUsed.toString());
    console.log(`Transaction was mined in block ${receipt.blockNumber}`);
    console.log(`Gas Used: ${receipt.cumulativeGasUsed.toString()}`)
    
    const block = receipt.blockNumber;
    console.log('block: ', block);
    const blockData = await provider.getBlock(block);
    console.log('blockData: ', blockData);
    console.log('Finished Block gas limit: ', blockData.gasLimit.toString());
    const transactions = blockData.transactions;
    console.log('tx hash again: ', tx.hash);
    console.log('transactions: ', transactions);
    const indexOf = transactions.indexOf(tx.hash);
    console.log('Index of txn: ', indexOf);
  
    return transactions
  }catch (err) {
    console.log('logReceipt Err: ', err);
  }
}

exports.buyToken = buyToken;
exports.sellToken = sellToken;
exports.logReceipt = logReceipt;
exports.calculateAmountOutMin = calculateAmountOutMin;