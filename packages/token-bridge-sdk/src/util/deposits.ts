import {
  L1TransactionReceipt,
  L1ToL2MessageStatus,
  EthDepositStatus
} from '@arbitrum/sdk'
import { Provider } from '@ethersproject/providers'
import { AssetType } from '../hooks/arbTokenBridge.types'
import { Transaction } from '../hooks/useTransactions'

export const updateAdditionalDepositData = async (
  depositTx: Transaction,
  l1Provider: Provider,
  l2Provider: Provider
) => {
  // 1. for all the fetched txns, fetch the transaction receipts and update their exact status
  // 2. on the basis of those, finally calculate the status of the transaction

  try {
    // fetch L1 transaction receipt
    const depositTxReceipt = await l1Provider.getTransactionReceipt(
      depositTx.txID
    )
    const l1TxReceipt = new L1TransactionReceipt(depositTxReceipt)

    // fetch timestamp creation date
    let timestampCreated = new Date().toISOString()
    if (depositTx.timestampCreated) {
      // if timestamp is already there in Subgraphs, take it from there
      timestampCreated = String(+depositTx.timestampCreated * 1000)
    } else if (depositTx.blockNumber) {
      // if timestamp not in subgraph, fallback to onchain data
      timestampCreated = String(
        (await l1Provider.getBlock(depositTx.blockNumber)).timestamp * 1000
      )
    }

    // Check if deposit is ETH
    if (depositTx.assetName === AssetType.ETH) {
      const updatedDepositTx = await updateAdditionalDepositDataETH({
        depositTx,
        l1TxReceipt,
        l2Provider,
        timestampCreated
      })

      return updatedDepositTx
    } else {
      // else if the transaction is not ETH ie. it's a ERC20 token deposit
      const updatedDepositTx = await updateAdditionalDepositDataToken({
        depositTx,
        l1TxReceipt,
        l2Provider,
        timestampCreated
      })
      return updatedDepositTx
    }
  } catch (e) {
    // error fetching transaction details through RPC, possibly because SDK doesn't support classic retryable transactions yet
    console.log(e)
    return { ...depositTx, status: 'warning' }
  }
}

const updateAdditionalDepositDataETH = async ({
  depositTx,
  l1TxReceipt,
  l2Provider,
  timestampCreated
}: {
  depositTx: Transaction
  timestampCreated: string
  l2Provider: Provider
  l1TxReceipt: L1TransactionReceipt
}) => {
  // from the receipt - get the eth-deposit-message
  const [ethDepositMessage] = await l1TxReceipt.getEthDeposits(l2Provider)

  if (!ethDepositMessage) {
    return
  }

  // from the eth-deposit-message, extract more things like retryableCreationTxID, status, etc
  const status = await ethDepositMessage.status()
  const isDeposited = status === EthDepositStatus.DEPOSITED

  const retryableCreationTxID = ethDepositMessage.l2DepositTxHash

  const l2BlockNum = isDeposited
    ? (await l2Provider.getTransaction(retryableCreationTxID)).blockNumber
    : null

  const timestampResolved = l2BlockNum
    ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
    : null

  // return the data to populate on UI
  const updatedDepositTx = {
    ...depositTx,
    status: retryableCreationTxID ? 'success' : 'pending',
    timestampCreated,
    timestampResolved,
    l1ToL2MsgData: {
      status: isDeposited
        ? L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2
        : L1ToL2MessageStatus.NOT_YET_CREATED,
      retryableCreationTxID,
      // Only show `l2TxID` after the deposit is confirmed
      l2TxID: isDeposited ? ethDepositMessage.l2DepositTxHash : undefined
    }
  }

  return updatedDepositTx
}

const updateAdditionalDepositDataToken = async ({
  depositTx,
  timestampCreated,
  l1TxReceipt,
  l2Provider
}: {
  depositTx: Transaction
  timestampCreated: string
  l2Provider: Provider
  l1TxReceipt: L1TransactionReceipt
}) => {
  const updatedDepositTx = {
    ...depositTx,
    timestampCreated
  }

  // get l1 to l2 message for status fields
  const [l1ToL2Msg] = await l1TxReceipt.getL1ToL2Messages(l2Provider)
  if (!l1ToL2Msg) {
    return updatedDepositTx
  }

  const res = await l1ToL2Msg.waitForStatus()

  const l2TxID = (() => {
    if (res.status === L1ToL2MessageStatus.REDEEMED) {
      return res.l2TxReceipt.transactionHash
    } else {
      return undefined
    }
  })()

  const l1ToL2MsgData = {
    status: res.status,
    l2TxID,
    fetchingUpdate: false,
    retryableCreationTxID: l1ToL2Msg.retryableCreationId
  }

  const isDeposited =
    l1ToL2MsgData.status === L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2

  const l2BlockNum = isDeposited
    ? (await l2Provider.getTransaction(l1ToL2Msg.retryableCreationId))
        .blockNumber
    : null

  const timestampResolved = l2BlockNum
    ? (await l2Provider.getBlock(l2BlockNum)).timestamp * 1000
    : null

  const completeDepositTx = {
    ...updatedDepositTx,
    status: l1ToL2Msg.retryableCreationId ? 'success' : 'pending', // TODO :handle other cases here
    timestampCreated,
    timestampResolved,
    l1ToL2MsgData: l1ToL2MsgData
  }

  return completeDepositTx
}