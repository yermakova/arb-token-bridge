// ***********************************************
// using commands.js you can create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import '@testing-library/cypress/add-commands'
import {
  l1NetworkConfig,
  NetworkType,
  setupMetamaskNetwork,
  startWebApp
} from './common'
import { shortenAddress } from '../../src/util/CommonUtils'

export function login({
  networkType,
  addNewNetwork = false,
  url,
  query
}: {
  networkType: NetworkType
  addNewNetwork?: boolean
  url?: string
  query?: { [s: string]: string }
}) {
  setupMetamaskNetwork(networkType, addNewNetwork).then(() => {
    startWebApp(url, query)
  })
}

// once all assertions are run, before test exit, make sure web-app is reset to original
export const logout = () => {
  cy.switchToCypressWindow().then(() => {
    cy.changeMetamaskNetwork(l1NetworkConfig.networkName).then(() => {
      // disconnect-metamask-wallet hangs if already not connected to metamask,
      // so we do it while logout instead of before login.
      cy.disconnectMetamaskWalletFromAllDapps().then(() => {
        cy.switchToCypressWindow().then(() => {
          cy.resetMetamaskAccount()
        })
      })
    })
  })
}

export const restoreAppState = () => {
  // restore local storage from previous test
  cy.restoreLocalStorage()
}

export const saveAppState = () => {
  // cypress clears local storage between tests
  // so in order to preserve local storage on the page between tests
  // we need to use the cypress-localstorage-commands plugin
  // or else we have to visit the page every test which will be much slower
  // https://docs.cypress.io/api/commands/clearlocalstorage
  cy.saveLocalStorage()
}

export const connectToApp = () => {
  // initial modal prompts which come in the web-app
  cy.findByText('Agree to terms').should('be.visible').click()
  cy.findByText('MetaMask').should('be.visible')
  cy.findByText('Connect to your MetaMask Wallet').should('be.visible').click()
}

export const closeLowBalanceDialog = () => {
  cy.findByRole('button', { name: /go to bridge/i })
    .should('be.visible')
    .click()
}

export const openTransactionsPanel = () => {
  cy.findByRole('button', { name: /account header button/i })
    .should('be.visible')
    .click()

  cy.findByRole('button', { name: /transactions/i })
    .should('be.visible')
    .click()
}

Cypress.Commands.addAll({
  connectToApp,
  login,
  logout,
  restoreAppState,
  saveAppState,
  openTransactionsPanel,
  closeLowBalanceDialog
})
