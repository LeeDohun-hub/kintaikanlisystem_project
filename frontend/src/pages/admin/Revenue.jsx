import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function Revenue() {
  const ym = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(ym)
  const [employees, setEmployees] = useState([])
  const [prices, setPrices] = useState([])
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [empId, setEmpId] = useState('')
  const [price, setPrice] = useState('')

  const load = () => {
    setError('')
    Promise.all([
      api.get('/employees').then(r => r.data).catch(() => []),
      api.get(`/unit-prices?month=${month}`).then(r => r.data).catch(() => []),
      api.get(`/statistics/monthly?month=${month}`).then(r => r.data).catch(() => null)
    ]).then(([emps, ups, st]) => {
      setEmployees(emps)
      setPrices(ups)
      setStats(st)
    }).catch(() => setError('불러오기 실패'))
  }

  useEffect(() => { load() }, [month])

  const savePrice = async (e) => {
    e.preventDefault()
    if (!empId || !price) return
    try {
      await api.post('/unit-prices', { employeeId: parseInt(empId, 10), month, price: parseFloat(price) })
      setPrice('')
      load()
    } catch {
      setError('단가 저장에 실패했습니다.')
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">매출 / 손익 관리</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>기준 월</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>단가 등록</h3>
        <form onSubmit={savePrice} className="form-row">
          <select value={empId} onChange={e => setEmpId(e.target.value)} required>
            <option value="">직원 선택</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
            ))}
          </select>
          <input type="number" step="0.01" placeholder="단가" value={price} onChange={e => setPrice(e.target.value)} />
          <button type="submit" className="primary">저장</button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>등록된 단가</h3>
        <table className="data-table">
          <thead><tr><th>직원ID</th><th>단가</th></tr></thead>
          <tbody>
            {prices.length === 0 ? (
              <tr><td colSpan={2}>없음</td></tr>
            ) : (
              prices.map((p, i) => <tr key={i}><td>{p.employeeId ?? '-'}</td><td>{p.price}</td></tr>)
            )}
          </tbody>
        </table>
      </div>

      {stats && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>월별 집계</h3>
          <pre style={{ fontSize: 13 }}>{JSON.stringify(stats, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default Revenue
