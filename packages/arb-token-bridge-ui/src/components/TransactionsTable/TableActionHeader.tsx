import { useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon
} from '@heroicons/react/outline'
import { TransactionsTableProps } from './TransactionsTable'

type TableActionHeaderProps = TransactionsTableProps

function validate_txhash(addr: string) {
  return /^0x([A-Fa-f0-9]{64})$/.test(addr)
}

export const TableActionHeader = ({
  type,
  pageParams,
  setPageParams,
  transactions,
  loading,
  error
}: TableActionHeaderProps) => {
  const layerType = type === 'deposits' ? 'L1' : 'L2'

  const [searchString, setSearchString] = useState(pageParams.searchString)
  const [searchError, setSearchError] = useState(false)

  const disableNextBtn = loading || transactions.length < pageParams.pageSize // if transactions are less than pagesize
  const disablePrevBtn = loading || !pageParams.pageNumber // if page number is 0, then don't prev.

  const onClickNext = () => {
    if (!disableNextBtn) {
      setPageParams(prevParams => ({
        ...prevParams,
        pageNumber: prevParams.pageNumber + 1
      }))
    }
  }

  const onClickPrev = () => {
    if (!disablePrevBtn) {
      setPageParams(prevParams => ({
        ...prevParams,
        pageNumber: prevParams.pageNumber - 1
      }))
    }
  }

  const search = () => {
    const trimmedSearchString = searchString.trim()
    if (trimmedSearchString && !validate_txhash(trimmedSearchString)) {
      setSearchError(true)
      return
    }
    // search logic - using `searchString`
    setPageParams(prevParams => ({
      ...prevParams,
      pageNumber: 0,
      pageSize: 10,
      searchString: trimmedSearchString
    }))
  }

  return (
    <div
      className={`sticky top-0 left-0 flex w-auto flex-nowrap items-center justify-between gap-4 rounded-tr-lg bg-white p-3 text-sm ${
        type !== 'deposits' && 'rounded-tl-lg'
      }`}
    >
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
          className={`rounded border border-gray-10 p-1 ${
            disablePrevBtn ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
          }`}
          onClick={onClickPrev}
        >
          <ChevronLeftIcon className="h-3 w-3" />
        </button>

        <div className="whitespace-nowrap p-2">
          Page {pageParams.pageNumber + 1}{' '}
        </div>

        <button
          className={`rounded border border-gray-10 p-1 ${
            disableNextBtn ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'
          }`}
          onClick={onClickNext}
        >
          <ChevronRightIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}