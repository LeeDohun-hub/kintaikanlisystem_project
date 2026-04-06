import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function WorkView() {
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
      <h2 className="page-title">근무 조회 (전체)</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>조회 월</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>직원</th>
              <th>일자</th>
              <th>시작</th>
              <th>종료</th>
              <th>구분</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>데이터가 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td>{r.employeeName ?? r.employeeCode ?? '-'}</td>
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
                  <td>{r.workType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkView
