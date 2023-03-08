import './commands'
import '@synthetixio/synpress/support'
import 'cypress-localstorage-commands'
import { l1NetworkConfig } from './common';

Cypress.Keyboard.defaults({
  keystrokeDelay: 50
})

before(() => {
  cy.setupMetamask(Cypress.env('PRIVATE_KEY'), 'goerli')
  // cy.setupMetamask(Cypress.env('PRIVATE_KEY'), {
  //   networkName: 'localhost-eth',
  //   rpcUrl: 'http://geth:8545',
  //   chainId: 1337,
  //   symbol: 'ETH',
  //   blockExplorer: 'http://geth:8545',
  //   isTestnet: true
  // })
  cy.addMetamaskNetwork(l1NetworkConfig)
})
