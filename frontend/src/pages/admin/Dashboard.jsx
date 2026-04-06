import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function Dashboard() {
  const ym = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(ym)
  const [empCount, setEmpCount] = useState(0)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    Promise.all([
      api.get('/employees').then(r => r.data?.length ?? 0).catch(() => 0),
      api.get(`/statistics/monthly?month=${month}`).then(r => r.data).catch(() => null)
    ]).then(([cnt, s]) => {
      setEmpCount(cnt)
      setStats(s)
    }).catch(() => setError('집계를 불러오지 못했습니다.'))
  }, [month])

  return (
    <div className="page-container">
      <h2 className="page-title">대시보드</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>기준 월</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      <div className="card">
        <p><strong>등록 직원 수:</strong> {empCount}명</p>
        {stats && (
          <pre style={{ marginTop: 12, fontSize: 13, overflow: 'auto' }}>{JSON.stringify(stats, null, 2)}</pre>
        )}
        {!stats && !error && <p>해당 월 집계 데이터가 없습니다.</p>}
      </div>
    </div>
  )
}

export default Dashboard
