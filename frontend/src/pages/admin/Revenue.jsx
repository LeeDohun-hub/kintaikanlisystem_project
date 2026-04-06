import React, { useState, useEffect, useCallback } from 'react'
import api from '../../api/api'

function Revenue() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [employees, setEmployees] = useState([])
  const [unitPriceMap, setUnitPriceMap] = useState({})
  const [stats, setStats] = useState(null)
  const [editMap, setEditMap] = useState({})
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/employees')
      .then(res => setEmployees(res.data.filter(e => e.role === 'EMPLOYEE')))
      .catch(() => {})
  }, [])

  const loadData = useCallback(() => {
    api.get(`/unit-prices?month=${month}`)
      .then(res => {
        const map = {}
        res.data.forEach(u => { map[u.employee.id] = u.price })
        setUnitPriceMap(map)
      })
      .catch(() => {})
    api.get(`/statistics/monthly?month=${month}`)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
  }, [month])

  useEffect(() => { loadData() }, [loadData])

  const handlePriceEdit = (empId, val) => {
    setEditMap(prev => ({ ...prev, [empId]: val }))
  }

  const savePrice = async (empId) => {
    const price = editMap[empId]
    if (price === undefined || price === '') return
    try {
      await api.post('/unit-prices', { employeeId: empId, month, price: parseFloat(price) })
      setSuccess('단가가 저장되었습니다.')
      setTimeout(() => setSuccess(''), 2000)
      loadData()
    } catch {
      // ignore
    }
  }

  const getDisplayPrice = (emp) => {
    if (editMap[emp.id] !== undefined) return editMap[emp.id]
    return unitPriceMap[emp.id] ?? emp.unitPrice ?? 0
  }

  const getEmpStats = (empId) => stats?.employees.find(e => e.employeeId === empId)

  return (
    <div className="page-container" style={{ maxWidth: '100%' }}>
      <h2 className="page-title">매출/손익 관리</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <label style={{ fontWeight: 500, fontSize: 14 }}>월 선택:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
      </div>

      {success && <div className="success-msg">{success}</div>}

      <div className="card">
        <h3 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 15 }}>직원별 단가 및 매출</h3>
        <table>
          <thead>
            <tr>
              <th>직원명</th>
              <th style={{ textAlign: 'right' }}>근무시간</th>
              <th style={{ textAlign: 'right' }}>시간당 단가 (¥)</th>
              <th style={{ textAlign: 'right' }}>예상 매출</th>
              <th style={{ textAlign: 'center' }}>단가 수정</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const empStats = getEmpStats(emp.id)
              const displayPrice = unitPriceMap[emp.id] ?? emp.unitPrice ?? 0
              return (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td style={{ textAlign: 'right' }}>{empStats?.totalHours || 0}h</td>
                  <td style={{ textAlign: 'right' }}>¥{Number(displayPrice).toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#3498db' }}>
                    ¥{Number(empStats?.revenue || 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={getDisplayPrice(emp)}
                        onChange={e => handlePriceEdit(emp.id, e.target.value)}
                        style={{ width: 90, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 }}
                        min="0"
                      />
                      <button
                        onClick={() => savePrice(emp.id)}
                        style={{ background: '#3498db', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 4, fontSize: 13 }}
                      >
                        저장
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: '10px 12px' }}>총 매출</td>
              <td style={{ textAlign: 'right', color: '#2ecc71', fontSize: 16 }}>
                ¥{Number(stats?.totalRevenue || 0).toLocaleString()}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default Revenue
