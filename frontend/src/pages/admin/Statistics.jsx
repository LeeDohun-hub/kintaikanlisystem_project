import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function Statistics() {
  const ym = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(ym)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.get(`/statistics/monthly?month=${month}`)
      .then(res => setData(res.data))
      .catch(() => {
        setData(null)
        setError('통계를 불러오지 못했습니다.')
      })
  }, [month])

  return (
    <div className="page-container">
      <h2 className="page-title">통계</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>조회 월</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {data ? (
          <pre style={{ fontSize: 13, overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>
        ) : (
          !error && <p>데이터가 없습니다.</p>
        )}
      </div>
    </div>
  )
}

export default Statistics
