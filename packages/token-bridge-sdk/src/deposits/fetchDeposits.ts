import { Provider } from '@ethersproject/providers'
import { AssetType } from '../hooks/arbTokenBridge.types'
import { Transaction } from '../hooks/useTransactions'
import { utils } from 'ethers'
import { updateAdditionalDepositData } from '../util/deposits'
import {
  fetchDepositsFromSubgraph,
  FetchDepositsFromSubgraphResult
} from './fetchDepositsFromSubgraph'

export type DepositETHSubgraphResult = {
  id: string
  senderAliased: string
  destAddr: string
  value: string
  msgData: string
  transactionHash: string
  blockCreatedAt: string
}

/* Fetch complete deposits - both ETH and Token deposits from subgraph into one list */
/* Also fills in any additional data required per transaction for our UI logic to work well */
/* TODO : Add event logs as well */
export async function fetchDeposits({
  address,
  fromBlock,
  toBlock,
  l1Provider,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock?: number
  toBlock?: number
  l1Provider: Provider
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<Transaction[]> {
  const l1ChainId = (await l1Provider.getNetwork()).chainId
  const l2ChainId = (await l2Provider.getNetwork()).chainId

  const latestL1BlockNumber = await l1Provider.getBlockNumber()

  const t = new Date().getTime()

  if (!fromBlock) {
    fromBlock = 0
  }

  if (!toBlock) {
    toBlock = latestL1BlockNumber
  }

  const depositsFromSubgraph = await fetchDepositsFromSubgraph({
    address,
    fromBlock,
    toBlock,
    l1Provider,
    l2Provider,
    pageSize,
    pageNumber,
    searchString
  })

  const ethDepositsFromSubgraph = depositsFromSubgraph.map(
    (tx: FetchDepositsFromSubgraphResult) => {
      const isEthDeposit = !tx?.l1Token?.id

      return {
        type: 'deposit-l1',
        status: 'pending',
        value: utils.formatEther(isEthDeposit ? tx.ethValue : tx.tokenAmount),
        txID: tx.transactionHash,
        tokenAddress: isEthDeposit ? null : tx.l1Token.id,
        sender: address,

        asset: isEthDeposit ? 'ETH' : null,
        assetName: isEthDeposit ? 'ETH' : null,
        assetType: isEthDeposit ? AssetType.ETH : null,

        l1NetworkID: String(l1ChainId),
        l2NetworkID: String(l2ChainId),
        blockNumber: tx.blockCreatedAt
      }
    }
  ) as unknown as Transaction[]

  const t1 = new Date().getTime()
  console.log(
    `*** done getting ETH subgraph data, took ${
      Math.round(t1 - t) / 1000
    } seconds`
  )

  const finalTransactions = (await Promise.all(
    ethDepositsFromSubgraph.map(depositTx =>
      updateAdditionalDepositData(depositTx, l1Provider, l2Provider)
    )
  )) as Transaction[]

  const t2 = new Date().getTime()
  console.log(
    `*** done getting final ETH additional data, took ${
      Math.round(t2 - t1) / 1000
    } seconds`
  )

  return finalTransactions
}