

module.exports = {
  sellEth: true,
  ropsten: {
    listenerDebug: true,
    gasLimit: 8000000, //wei?,
    additionalGas: '10',  //gwei
    slippage: 99,  //percent
    tokensInETH: '0.01',  //0.1 seems to be good
    numTokensToSell: '1',
    deadlineMinutes: 5
  },
  mainnet: {
    listenerDebug: false,
    enableTrading: true,
    gasLimit: 8000000, //wei?
    additionalGas: '50',  //gwei
    slippage: 10,  //percent
    tokensInETH: '0.0001',
    numTokensToSell: '100',
    deadlineMinutes: 5
  }
}