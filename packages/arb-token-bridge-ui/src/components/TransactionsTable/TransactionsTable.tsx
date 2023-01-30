import React, { useCallback, useEffect, useState } from 'react'
import Loader from 'react-loader-spinner'

import { MergedTransaction } from '../../state/app/state'
import { TransactionsTableDepositRow } from './TransactionsTableDepositRow'
import { TransactionsTableWithdrawalRow } from './TransactionsTableWithdrawalRow'
import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import ArbinautMoonWalking from '../../assets/ArbinautMoonWalking.webp'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon
} from '@heroicons/react/outline'
import { fetchDeposits } from './fetchEthDepositsFromSubgraph_draft'
import { fetchWithdrawals } from 'token-bridge-sdk'
import { useAppState } from '../../state'
import { useGateways } from './useGateways'
import { transformDeposits, transformWithdrawals } from '../../state/app/utils'

export type PageParams = {
  searchString?: string
  pageNumber?: number
  pageSize?: number
}

const isDeposit = (tx: MergedTransaction) => {
  return tx.direction === 'deposit' || tx.direction === 'deposit-l1'
}

function EmptyTableRow({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Single empty row to set column width */}
      <tr>
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
        <td className="w-1/5" />
      </tr>
      <tr>
        <td colSpan={5}>
          <div className="flex h-16 items-center py-3 px-6">{children}</div>
        </td>
      </tr>
    </>
  )
}

const NoDataOverlay = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-full w-full flex-col items-center p-[2rem]">
      {children}

      <img
        src={ArbinautMoonWalking}
        alt="Moon walking Arbibaut"
        className="lg:max-h-[50%] lg:max-w-[50%]"
      />
    </div>
  )
}

export type TransactionsDataStatus = 'loading' | 'error' | 'success'

export type TransactionsTableProps = {
  type: 'deposits' | 'withdrawals'
}

function validate_txhash(addr: string) {
  return /^0x([A-Fa-f0-9]{64})$/.test(addr)
}

export function TransactionsTable({ type }: TransactionsTableProps) {
  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const { l1, l2, isSmartContractWallet } = useNetworksAndSigners()

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)
  const [transactions, setTransactions] = useState<MergedTransaction[]>([])
  const [pageParams, setPageParams] = useState<PageParams>({
    searchString: '',
    pageNumber: 0,
    pageSize: 10
  })
  const gatewaysToUse = useGateways()
  const [searchString, setSearchString] = useState(pageParams.searchString)
  const [searchError, setSearchError] = useState(false)

  const search = () => {
    if (searchString && !validate_txhash(searchString)) {
      setSearchError(true)
      return
    }
    // search logic - using `searchString`
    setPageParams(prevParams => ({
      ...prevParams,
      pageNumber: 0,
      pageSize: 10,
      searchString
    }))
  }

  const next = () => {
    setPageParams(prevParams => ({
      ...prevParams,
      pageNumber: (prevParams?.pageNumber || 0) + 1
    }))
  }

  const prev = () => {
    setPageParams(prevParams => ({
      ...prevParams,
      pageNumber: (prevParams?.pageNumber || 1) - 1
    }))
  }

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      if (type === 'deposits') {
        const transactions = await fetchDeposits({
          address: walletAddress,
          l1Provider: l1.provider,
          l2Provider: l2.provider,
          ...pageParams
        })

        setTransactions(transformDeposits(transactions))
      } else {
        const transactions = await fetchWithdrawals({
          address: walletAddress,
          l1Provider: l1.provider,
          l2Provider: l2.provider,
          ...pageParams,
          gatewayAddresses: gatewaysToUse
        })
        setTransactions(transformWithdrawals(transactions))
      }
      setLoading(false)
    } catch (e) {
      setLoading(false)
      setError(true)
    }
  }, [pageParams, type])

  useEffect(() => {
    fetchTransactions()
  }, [pageParams, l1, l2])

  const status = loading ? 'loading' : error ? 'error' : 'success'
  const layerType = type === 'deposits' ? 'L1' : 'L2'

  return (
    <>
      {/* top search and pagination bar */}
      <div className="sticky top-0 left-0 flex w-auto flex-nowrap items-center justify-between gap-4 rounded-tr-lg bg-white p-3 text-sm">
        {/* Search bar */}
        <div className="relative flex h-full w-full grow items-center rounded border-2 bg-white px-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-9" />
          <input
            className="text-normal h-full w-full p-2 font-light placeholder:text-gray-9"
            type="text"
            placeholder={`Search for ${layerType} transaction hash`}
            value={searchString}
            onChange={e => {
              searchError ? setSearchError(false) : null
              setSearchString(e.target.value)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                search()
              }
            }}
          />
          {searchError ? (
            <span className="absolute bottom-0 right-4 bg-white p-[9px] text-xs text-red-400">
              {`Oops! Seems like a wrong ${layerType} transaction hash.`}
            </span>
          ) : null}
        </div>
        {/* Pagination buttons */}
        <div className="flex  w-auto  shrink grow-0 flex-row flex-nowrap items-center justify-end text-gray-10">
          <button
            className="rounded border border-gray-10 p-1"
            onClick={prev}
            disabled={!pageParams?.pageNumber}
          >
            <ChevronLeftIcon className="h-3 w-3" />
          </button>

          <div className="whitespace-nowrap p-2">
            Page {(pageParams?.pageNumber || 0) + 1}{' '}
          </div>

          <button className="rounded border border-gray-10 p-1" onClick={next}>
            <ChevronRightIcon className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* when there are no search results found */}
      {status === 'success' && !transactions.length && searchString && (
        <NoDataOverlay>
          <div className="text-center text-white">
            <p className="whitespace-nowrap text-lg">
              Oops! Looks like nothing matched your search query.
            </p>
            <p className="whitespace-nowrap text-base">
              You can search for full or partial tx ID&apos;s.
            </p>
          </div>
        </NoDataOverlay>
      )}

      <table className="w-full overflow-hidden  rounded-b-lg bg-white">
        <thead className="text-left text-sm text-gray-10">
          <tr>
            <th className="py-3 pl-6 pr-3 font-normal">Status</th>
            <th className="px-3 py-3 font-normal">Time</th>
            <th className="px-3 py-3 font-normal">Amount</th>
            <th className="px-3 py-3 font-normal">TxID</th>
            <th className="py-3 pl-3 pr-6 font-normal">
              {/* Empty header text */}
            </th>
          </tr>
        </thead>

        <tbody>
          {status === 'loading' && (
            <EmptyTableRow>
              <div className="flex flex-row items-center space-x-3">
                <Loader type="TailSpin" color="black" width={16} height={16} />
                <span className="text-sm font-medium">
                  Loading transactions
                </span>
              </div>
            </EmptyTableRow>
          )}

          {status === 'error' && (
            <EmptyTableRow>
              <span className="text-sm font-medium text-brick-dark">
                Failed to load transactions
              </span>
            </EmptyTableRow>
          )}

          {status === 'success' && (
            <>
              {transactions.length > 0 ? (
                transactions.map((tx, index) => {
                  const isFinalRow = index === transactions.length - 1

                  return isDeposit(tx) ? (
                    <TransactionsTableDepositRow
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                      className={!isFinalRow ? 'border-b border-gray-1' : ''}
                    />
                  ) : (
                    <TransactionsTableWithdrawalRow
                      key={`${tx.txId}-${tx.direction}`}
                      tx={tx}
                      className={!isFinalRow ? 'border-b border-gray-1' : ''}
                    />
                  )
                })
              ) : (
                <EmptyTableRow>
                  <span className="text-sm font-medium">
                    {isSmartContractWallet
                      ? 'You can see tx history in your smart contract wallet'
                      : 'No transactions'}
                  </span>
                </EmptyTableRow>
              )}
            </>
          )}
        </tbody>
      </table>
    </>
  )
}
