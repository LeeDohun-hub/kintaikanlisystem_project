import React, { useEffect, useState } from 'react'
import api from '../../api/api'

function EmployeeMaster() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    employeeCode: '',
    employeeName: '',
    department: '',
    hourlyCost: '',
    activeFlag: 1
  })

  const load = () => {
    setError('')
    setLoading(true)
    api.get('/employees')
      .then((r) => setRows(r.data || []))
      .catch(() => setError('직원 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/employees', {
        employeeCode: form.employeeCode,
        employeeName: form.employeeName,
        department: form.department || undefined,
        hourlyCost: form.hourlyCost === '' ? undefined : Number(form.hourlyCost),
        activeFlag: Number(form.activeFlag)
      })
      setForm({ employeeCode: '', employeeName: '', department: '', hourlyCost: '', activeFlag: 1 })
      load()
    } catch (err) {
      const msg = err.response?.data?.error || '등록에 실패했습니다.'
      setError(typeof msg === 'string' ? msg : '등록에 실패했습니다.')
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">직원 마스터</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>직원 등록</h3>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <input
              name="employeeCode"
              value={form.employeeCode}
              onChange={onChange}
              placeholder="직원 코드 (예: EMP003)"
              required
              maxLength={20}
            />
            <input
              name="employeeName"
              value={form.employeeName}
              onChange={onChange}
              placeholder="직원명"
              required
              maxLength={50}
            />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <input
              name="department"
              value={form.department}
              onChange={onChange}
              placeholder="소속(선택)"
              maxLength={50}
            />
            <input
              name="hourlyCost"
              type="number"
              step="0.01"
              min="0"
              value={form.hourlyCost}
              onChange={onChange}
              placeholder="시급원가(선택, 미입력 0)"
            />
            <select name="activeFlag" value={form.activeFlag} onChange={onChange}>
              <option value={1}>유효(1)</option>
              <option value={0}>무효(0)</option>
            </select>
            <button type="submit" className="primary">등록</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>직원 목록</h3>
        {loading ? (
          <p>불러오는 중…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>코드</th>
                <th>이름</th>
                <th>부서</th>
                <th>시급원가</th>
                <th>유효</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6}>데이터가 없습니다.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.employeeId}>
                    <td>{r.employeeId}</td>
                    <td>{r.employeeCode}</td>
                    <td>{r.employeeName}</td>
                    <td>{r.department ?? ''}</td>
                    <td>{r.hourlyCost ?? ''}</td>
                    <td>{r.activeFlag}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default EmployeeMaster

