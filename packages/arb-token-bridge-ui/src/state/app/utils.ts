import dayjs from 'dayjs'
import { L1ToL2MessageStatus } from '@arbitrum/sdk'
import { ethers, BigNumber } from 'ethers'
import {
  L2ToL1EventResultPlus,
  Transaction,
  OutgoingMessageState,
  getUniqueIdOrHashFromEvent
} from 'token-bridge-sdk'
import { DepositStatus, MergedTransaction } from './state'

export const outgoungStateToString = {
  [OutgoingMessageState.UNCONFIRMED]: 'Unconfirmed',
  [OutgoingMessageState.CONFIRMED]: 'Confirmed',
  [OutgoingMessageState.EXECUTED]: 'Executed'
}

export const getDepositStatus = (tx: Transaction) => {
  if (tx.type !== 'deposit' && tx.type !== 'deposit-l1') return undefined
  if (tx.status === 'failure') {
    return DepositStatus.L1_FAILURE
  }
  if (tx.status === 'pending') {
    return DepositStatus.L1_PENDING
  }
  // l1 succeeded...
  const { l1ToL2MsgData } = tx
  if (!l1ToL2MsgData) {
    return DepositStatus.L2_PENDING
  }
  switch (l1ToL2MsgData.status) {
    case L1ToL2MessageStatus.NOT_YET_CREATED:
      return DepositStatus.L2_PENDING
    case L1ToL2MessageStatus.CREATION_FAILED:
      return DepositStatus.CREATION_FAILED
    case L1ToL2MessageStatus.EXPIRED:
      return tx.assetType === 'ETH'
        ? DepositStatus.L2_SUCCESS
        : DepositStatus.EXPIRED
    case L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2: {
      return tx.assetType === 'ETH'
        ? DepositStatus.L2_SUCCESS
        : DepositStatus.L2_FAILURE
    }
    case L1ToL2MessageStatus.REDEEMED:
      return DepositStatus.L2_SUCCESS
  }
}

export const transformDeposits = (
  deposits: Transaction[]
): MergedTransaction[] => {
  return deposits.map(tx => {
    return {
      direction: tx.type,
      status: tx.status,
      createdAt: tx.timestampCreated
        ? dayjs(tx.timestampCreated).format('MMM DD, YYYY hh:mm A')
        : null,
      createdAtTime: tx.timestampCreated
        ? dayjs(tx.timestampCreated).toDate().getTime()
        : null,
      resolvedAt: tx.timestampResolved
        ? dayjs(new Date(tx.timestampResolved)).format('MMM DD, YYYY hh:mm A')
        : null,
      txId: tx.txID,
      asset: tx.assetName?.toLowerCase(),
      value: tx.value,
      uniqueId: null, // not needed
      isWithdrawal: false,
      blockNum: tx.blockNumber || null,
      tokenAddress: tx.tokenAddress || null,
      l1ToL2MsgData: tx.l1ToL2MsgData,
      l2ToL1MsgData: tx.l2ToL1MsgData,
      depositStatus: getDepositStatus(tx)
    }
  })
}

export const transformWithdrawals = (
  withdrawals: L2ToL1EventResultPlus[]
): MergedTransaction[] => {
  return withdrawals.map(tx => {
    const uniqueIdOrHash = getUniqueIdOrHashFromEvent(tx)

    return {
      direction: 'outbox',
      status:
        tx.nodeBlockDeadline === 'EXECUTE_CALL_EXCEPTION'
          ? 'Failure'
          : outgoungStateToString[tx.outgoingMessageState],
      createdAt: dayjs(
        new Date(BigNumber.from(tx.timestamp).toNumber() * 1000)
      ).format('MMM DD, YYYY hh:mm A'),
      createdAtTime:
        BigNumber.from(tx.timestamp).toNumber() * 1000 +
        (uniqueIdOrHash ? 1000 : 0), // adding 60s for the sort function so that it comes before l2 action
      resolvedAt: null,
      txId: tx.l2TxHash || 'l2-tx-hash-not-found',
      asset: tx.symbol?.toLocaleLowerCase(),
      value: ethers.utils.formatUnits(tx.value?.toString(), tx.decimals),
      uniqueId: uniqueIdOrHash,
      isWithdrawal: true,
      blockNum: tx.ethBlockNum.toNumber(),
      tokenAddress: tx.tokenAddress || null,
      nodeBlockDeadline: tx.nodeBlockDeadline
    }
  })
}

export const filterAndSortTransactions = (
  transactions: Transaction[],
  walletAddress: string,
  l1ChainId: number | null,
  l2ChainId: number | null
) => {
  return transactions
    .filter(tx => tx.sender === walletAddress)
    .filter(tx => {
      const matchesL1 = tx.l1NetworkID === String(l1ChainId)
      const matchesL2 = tx.l2NetworkID === String(l2ChainId)

      // The `l2NetworkID` field was added later, so not all transactions will have it
      if (typeof tx.l2NetworkID === 'undefined') {
        return matchesL1
      }

      return matchesL1 && matchesL2
    })
    .reverse()
}