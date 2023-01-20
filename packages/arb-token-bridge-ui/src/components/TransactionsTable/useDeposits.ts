import { useNetworksAndSigners } from '../../hooks/useNetworksAndSigners'
import { useAppState } from '../../state'
import { useAppContextState } from '../App/AppContext'
import { fetchETHDepositsFromSubgraph } from './fetchEthDepositsFromSubgraph_draft'
import useSWR from 'swr'

export const useDeposits = ({
  searchString,
  pageNumber,
  pageSize
}: {
  searchString?: string
  pageNumber?: number
  pageSize?: number
}) => {
  const {
    app: {
      arbTokenBridge: { walletAddress }
    }
  } = useAppState()

  const { currentL1BlockNumber } = useAppContextState()

  const { l1, l2 } = useNetworksAndSigners()

  const l1Provider = l1.provider,
    l2Provider = l2.provider

  return useSWR(
    [
      'deposits',
      walletAddress,
      // currentL1BlockNumber,
      l1Provider,
      l2Provider,
      searchString,
      pageNumber,
      pageSize
    ],
    (
      _,
      _walletAddress,
      // _currentL1BlockNumber,
      _l1Provider,
      _l2Provider,
      _searchString,
      _pageNumber,
      _pageSize
    ) =>
      fetchETHDepositsFromSubgraph({
        address: _walletAddress,
        fromBlock: 0,
        toBlock: currentL1BlockNumber,
        l1Provider: _l1Provider,
        l2Provider: _l2Provider,
        searchString: _searchString,
        pageNumber: _pageNumber,
        pageSize: _pageSize
      }),
    {
      shouldRetryOnError: true,
      errorRetryCount: 2,
      errorRetryInterval: 1_000,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )
}
