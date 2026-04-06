import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function WorkHistory() {
  const ym = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(ym)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.get(`/attendance?month=${month}`)
      .then(res => setRows(res.data || []))
      .catch(() => {
        setRows([])
        setError('데이터를 불러오지 못했습니다.')
      })
  }, [month])

  return (
    <div className="page-container">
      <h2 className="page-title">근무 이력</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>조회 월</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>일자</th>
              <th>시작</th>
              <th>종료</th>
              <th>휴식(분)</th>
              <th>구분</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6}>데이터가 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
                  <td>{r.breakMinutes}</td>
                  <td>{r.workType}</td>
                  <td>{r.comment ?? ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkHistory
