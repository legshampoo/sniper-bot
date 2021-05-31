

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
    enableTrading: false,
    gasLimit: 8000000, //wei?
    additionalGas: '3',  //gwei
    slippage: 1,  //percent
    tokensInETH: '0.0001',
    numTokensToSell: '13000',
    deadlineMinutes: 5
  },
  // listener: {
  //   debugMode: true,
  //   enableTrading: false,
  //   gasLimit: 8000000, //wei?
  //   additionalGas: '10',  //gwei
  //   slippage: 99,  //percent
  //   tokensInETH: '0.01',
  //   numTokensToSell: '1',
  //   deadlineMinutes: 5
  // }
}