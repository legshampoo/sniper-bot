require('dotenv').config();
const { ChainId } = require('@uniswap/sdk');

module.exports = {
  ropsten: {
    network: 'ropsten',
    chainId: ChainId.ROPSTEN,
    infura: 'https://ropsten.infura.io/v3/' + process.env.INFURA_KEY,
    infuraWebsocket: 'wss://ropsten.infura.io/ws/v3/' + process.env.INFURA_KEY,
    weth: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    dai: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
    desiredToken: '0xaD6D458402F60fD3Bd25163575031ACDce07538D',  //using dai
    wallet: '0xf13362a3FE5fa5805f7CCF23c68656d7162c4D0c',
    privateKey: process.env.PRIVATE_KEY,
    uniswapRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    uniswapFactory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  },
  mainnet: {
    network: 'mainnet',
    chainId: ChainId.MAINNET,
    infura: 'https://mainnet.infura.io/v3/' + process.env.INFURA_KEY,
    infuraWebsocket: 'wss://mainnet.infura.io/ws/v3/' + process.env.INFURA_KEY,
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', //I think?
    dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    desiredToken: '0x03be5c903c727ee2c8c4e9bc0acc860cca4715e2',  //ternoa
    wallet: '0xf13362a3FE5fa5805f7CCF23c68656d7162c4D0c',
    privateKey: process.env.PRIVATE_KEY,
    uniswapRouter: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    uniswapFactory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  }
}

