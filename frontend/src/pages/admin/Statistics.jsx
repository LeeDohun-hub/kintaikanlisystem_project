import React, { useState, useEffect } from 'react'
import api from '../../api/api'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c']

function Statistics() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get(`/statistics/monthly?month=${month}`)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
  }, [month])

  const utilizationData = stats ? {
    labels: stats.employees.map(e => e.employeeName),
    datasets: [{
      data: stats.employees.map(e => e.utilizationRate),
      backgroundColor: COLORS.slice(0, stats.employees.length)
    }]
  } : null

  const hoursData = stats ? {
    labels: stats.employees.map(e => e.employeeName),
    datasets: [{
      label: '근무시간 (h)',
      data: stats.employees.map(e => e.totalHours),
      backgroundColor: COLORS.slice(0, stats.employees.length),
      borderRadius: 4
    }]
  } : null

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <h2 className="page-title">통계</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontWeight: 500, fontSize: 14 }}>월 선택:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
      </div>

      {!stats || stats.employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          해당 월의 데이터가 없습니다.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 15 }}>가동률 (%)</h3>
              <Doughnut
                data={utilizationData}
                options={{ plugins: { legend: { position: 'bottom' } } }}
              />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 15 }}>직원별 근무시간</h3>
              <Bar
                data={hoursData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 15 }}>상세 통계</h3>
            <table>
              <thead>
                <tr>
                  <th>직원명</th>
                  <th style={{ textAlign: 'right' }}>근무일수</th>
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
                      <span style={{ color: e.utilizationRate >= 80 ? '#2ecc71' : e.utilizationRate >= 50 ? '#f39c12' : '#e74c3c', fontWeight: 600 }}>
                        {e.utilizationRate}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>¥{Number(e.revenue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={4}>합계 (예상 총 매출)</td>
                  <td style={{ textAlign: 'right', color: '#3498db' }}>
                    ¥{Number(stats.totalRevenue).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Statistics
