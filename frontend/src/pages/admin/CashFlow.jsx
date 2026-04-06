import React, { useState, useEffect, useCallback } from 'react'
import api from '../../api/api'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function CashFlow() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [schedules, setSchedules] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({
    employeeId: '',
    month: new Date().toISOString().slice(0, 7),
    scheduledAmount: '',
    scheduledDate: ''
  })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/employees')
      .then(res => setEmployees(res.data.filter(e => e.role === 'EMPLOYEE')))
      .catch(() => {})
  }, [])

  const loadSchedules = useCallback(() => {
    api.get(`/payment-schedules?month=${month}`)
      .then(res => setSchedules(res.data))
      .catch(() => setSchedules([]))
  }, [month])

  useEffect(() => { loadSchedules() }, [loadSchedules])

  const handleAdd = async () => {
    if (!form.employeeId || !form.scheduledAmount) {
      setError('직원과 금액을 입력하세요.')
      return
    }
    setError('')
    try {
      await api.post('/payment-schedules', {
        ...form,
        scheduledAmount: parseFloat(form.scheduledAmount),
        employeeId: parseInt(form.employeeId)
      })
      setSuccess('저장되었습니다.')
      setTimeout(() => setSuccess(''), 2000)
      setForm(f => ({ ...f, scheduledAmount: '', scheduledDate: '' }))
      loadSchedules()
    } catch {
      setError('저장에 실패했습니다.')
    }
  }

  const toggleReceived = async (schedule) => {
    try {
      await api.put(`/payment-schedules/${schedule.id}`, {
        isReceived: !schedule.isReceived,
        scheduledAmount: schedule.scheduledAmount,
        scheduledDate: schedule.scheduledDate
      })
      loadSchedules()
    } catch {
      // ignore
    }
  }

  const totalScheduled = schedules.reduce((s, r) => s + (r.scheduledAmount || 0), 0)
  const totalReceived = schedules.filter(r => r.isReceived).reduce((s, r) => s + (r.scheduledAmount || 0), 0)
  const totalPending = totalScheduled - totalReceived

  const chartData = {
    labels: ['예정 금액', '수령 완료', '미수령'],
    datasets: [{
      data: [totalScheduled, totalReceived, totalPending],
      backgroundColor: ['#3498db', '#2ecc71', '#e74c3c'],
      borderRadius: 4
    }]
  }

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <h2 className="page-title">캐시플로우</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontWeight: 500, fontSize: 14 }}>월 선택:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: '총 예정 금액', value: totalScheduled, color: '#3498db' },
          { label: '수령 완료', value: totalReceived, color: '#2ecc71' },
          { label: '미수령', value: totalPending, color: '#e74c3c' }
        ].map(item => (
          <div key={item.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>
              ¥{Number(item.value).toLocaleString()}
            </div>
            <div style={{ color: '#7f8c8d', marginTop: 4, fontSize: 13 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 14, color: '#2c3e50', fontSize: 15 }}>입금 예정 추가</h3>
          {success && <div className="success-msg">{success}</div>}
          {error && <div className="error-msg">{error}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#374151' }}>직원</label>
              <select
                value={form.employeeId}
                onChange={e => setForm({ ...form, employeeId: e.target.value })}
                style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
              >
                <option value="">선택</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#374151' }}>대상 월</label>
              <input
                type="month"
                value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })}
                style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#374151' }}>금액 (¥)</label>
              <input
                type="number"
                value={form.scheduledAmount}
                onChange={e => setForm({ ...form, scheduledAmount: e.target.value })}
                placeholder="금액 입력"
                style={{ width: 110, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                min="0"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: '#374151' }}>예정일</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
              />
            </div>
            <button
              onClick={handleAdd}
              style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}
            >
              추가
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14, color: '#2c3e50', fontSize: 15 }}>현황 차트</h3>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 15 }}>입금 현황</h3>
        <table>
          <thead>
            <tr>
              <th>직원명</th>
              <th>대상 월</th>
              <th style={{ textAlign: 'right' }}>금액</th>
              <th>예정일</th>
              <th style={{ textAlign: 'center' }}>수령 여부</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</td>
              </tr>
            ) : (
              schedules.map(s => (
                <tr key={s.id} style={{ opacity: s.isReceived ? 0.6 : 1 }}>
                  <td>{s.employee?.name || '-'}</td>
                  <td>{s.month}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>¥{Number(s.scheduledAmount).toLocaleString()}</td>
                  <td>{s.scheduledDate || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleReceived(s)}
                      style={{
                        background: s.isReceived ? '#2ecc71' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        padding: '4px 14px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {s.isReceived ? '✓ 수령 완료' : '미수령'}
                    </button>
                  </td>
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
