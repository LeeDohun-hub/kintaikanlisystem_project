import { useState, useEffect } from 'react'
import api from '../api/api'

/**
 * @param {string} month — YYYY-MM
 */
export function useWorkTimeByMonth(month) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api
      .get(`/worktime?month=${month}`)
      .then((res) => setRows(res.data || []))
      .catch(() => {
        setRows([])
        setError('데이터를 불러오지 못했습니다.')
      })
  }, [month])

  return { rows, error }
}
