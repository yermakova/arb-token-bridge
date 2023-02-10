import { gql } from '@apollo/client'
import { BigNumber } from '@ethersproject/bignumber'
import { Provider } from '@ethersproject/providers'

import { getL2SubgraphClient } from '../util/subgraph'

export type FetchWithdrawalsFromSubgraphResult = {
  id: string
  type: 'EthWithdrawal' | 'TokenWithdrawal'
  sender: string
  receiver: string
  ethValue: string
  l1Token?: {
    id: string
  }
  tokenAmount: string
  isClassic: boolean
  l2BlockTimestamp: string
  l2TxHash: string
  l2BlockNum: string
}

/**
 * Fetches initiated withdrawals from subgraph in range of [fromBlock, toBlock].
 *
 * @param query Query params
 * @param query.address Account address
 * @param query.fromBlock Start at this block number (including)
 * @param query.toBlock Stop at this block number (including)
 * @param query.l2Provider Provider for the L2 network
 */
export async function fetchWithdrawalsFromSubgraph({
  address,
  fromBlock,
  toBlock,
  l2Provider,
  pageSize = 10,
  pageNumber = 0,
  searchString = ''
}: {
  address: string
  fromBlock: number
  toBlock: number
  l2Provider: Provider
  pageSize?: number
  pageNumber?: number
  searchString?: string
}): Promise<FetchWithdrawalsFromSubgraphResult[]> {
  if (fromBlock === 0 && toBlock === 0) {
    return []
  }

  const l2ChainId = (await l2Provider.getNetwork()).chainId

  const res = await getL2SubgraphClient(l2ChainId).query({
    query: gql`{
        withdrawals(
            where: {
            sender: "${address}",
            l2BlockNum_gte: ${fromBlock},
            l2BlockNum_lte: ${toBlock},
            ${searchString ? `l2TxHash_contains: "${searchString}"` : ''}
            }
            orderBy: l2BlockTimestamp
            orderDirection: desc
            first: ${pageSize},
            skip: ${pageNumber * pageSize}
        ) {
            id,
            type,
            sender,
            receiver,
            ethValue,
            l1Token {
                id
            },
            tokenAmount,
            isClassic,
            l2BlockTimestamp,
            l2TxHash,
            l2BlockNum
        }
    }`
  })

  return res.data.withdrawals.map((eventData: any) => {
    const {
      id,
      type,
      sender,
      receiver,
      ethValue,
      l1Token,
      tokenAmount,
      isClassic,
      l2BlockTimestamp,
      l2TxHash,
      l2BlockNum
    } = eventData

    return {
      id,
      type,
      sender,
      receiver,
      ethValue,
      l1Token,
      tokenAmount,
      isClassic,
      l2BlockTimestamp,
      l2TxHash,
      l2BlockNum
    }
  })
}