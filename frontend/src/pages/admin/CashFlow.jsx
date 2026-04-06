import React, { useState, useEffect } from 'react'
import api from '../../api/api'

function CashFlow() {
  const ym = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(ym)
  const [employees, setEmployees] = useState([])
  const [schedules, setSchedules] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ employeeId: '', expectedDate: '', amount: '' })

  const load = () => {
    setError('')
    Promise.all([
      api.get('/employees').then(r => r.data).catch(() => []),
      api.get(`/payment-schedules?month=${month}`).then(r => r.data).catch(() => [])
    ]).then(([emps, sch]) => {
      setEmployees(emps)
      setSchedules(sch)
    }).catch(() => setError('불러오기 실패'))
  }

  useEffect(() => { load() }, [month])

  const addSchedule = async (e) => {
    e.preventDefault()
    try {
      await api.post('/payment-schedules', {
        employeeId: parseInt(form.employeeId, 10),
        month,
        expectedDate: form.expectedDate,
        amount: parseFloat(form.amount)
      })
      setForm({ employeeId: '', expectedDate: '', amount: '' })
      load()
    } catch {
      setError('등록에 실패했습니다.')
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">캐시플로우</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>기준 월</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>입금 예정 등록</h3>
        <form onSubmit={addSchedule}>
          <div className="form-row">
            <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
              <option value="">직원</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} required />
            <input type="number" step="0.01" placeholder="금액" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <button type="submit" className="primary">추가</button>
          </div>
        </form>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr><th>예정일</th><th>금액</th><th>상태</th></tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr><td colSpan={3}>없음</td></tr>
            ) : (
              schedules.map((s, i) => (
                <tr key={s.id ?? i}>
                  <td>{s.expectedDate}</td>
                  <td>{s.amount}</td>
                  <td>{s.status ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CashFlow
