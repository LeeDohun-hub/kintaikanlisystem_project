import React, { useState, useEffect } from 'react'
import api from '../../api/api'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ color: '#7f8c8d', marginTop: 6, fontSize: 13 }}>{label}</div>
    </div>
  )
}

function Dashboard() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [stats, setStats] = useState(null)
  const [empCount, setEmpCount] = useState(0)

  useEffect(() => {
    api.get('/employees')
      .then(res => setEmpCount(res.data.filter(e => e.role === 'EMPLOYEE').length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get(`/statistics/monthly?month=${month}`)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
  }, [month])

  const totalHours = stats?.employees.reduce((s, e) => s + e.totalHours, 0).toFixed(1) || '0.0'
  const totalRevenue = stats?.totalRevenue || 0

  const chartData = stats ? {
    labels: stats.employees.map(e => e.employeeName),
    datasets: [{
      label: '근무시간 (h)',
      data: stats.employees.map(e => e.totalHours),
      backgroundColor: '#3498db',
      borderRadius: 4
    }]
  } : null

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <h2 className="page-title">대시보드</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontWeight: 500, fontSize: 14 }}>월 선택:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="총 직원 수" value={`${empCount}명`} color="#3498db" />
        <StatCard label="총 근무시간" value={`${totalHours}h`} color="#2ecc71" />
        <StatCard label="예상 매출" value={`¥${Number(totalRevenue).toLocaleString()}`} color="#e74c3c" />
      </div>

      {chartData && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 16 }}>직원별 근무 시간</h3>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
            height={80}
          />
        </div>
      )}

      {stats && stats.employees.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 16 }}>직원별 현황</h3>
          <table>
            <thead>
              <tr>
                <th>직원명</th>
                <th style={{ textAlign: 'right' }}>근무일</th>
                <th style={{ textAlign: 'right' }}>총 근무시간</th>
                <th style={{ textAlign: 'right' }}>가동률</th>
                <th style={{ textAlign: 'right' }}>예상 매출</th>
              </tr>
            </thead>
            <tbody>
              {stats.employees.map(e => (
                <tr key={e.employeeId}>
                  <td>{e.employeeName}</td>
                  <td style={{ textAlign: 'right' }}>{e.workDays}일</td>
                  <td style={{ textAlign: 'right' }}>{e.totalHours}h</td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: e.utilizationRate >= 80 ? '#2ecc71' : e.utilizationRate >= 50 ? '#f39c12' : '#e74c3c' }}>
                      {e.utilizationRate}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>¥{Number(e.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Dashboard
