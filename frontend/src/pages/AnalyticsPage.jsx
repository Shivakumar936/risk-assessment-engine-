import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRiskStats, getAllRisks, exportRisksCSV } from '../services/riskService'
import ReportStreamer from '../components/ReportStreamer'
import Navbar from '../components/Navbar'   
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts'

// colour palettes
const CATEGORY_COLOURS = [
  '#1B4F8A', '#2E86C1', '#1ABC9C',
  '#F39C12', '#E74C3C', '#8E44AD', '#27AE60',
]

const STATUS_COLOURS = {
  OPEN:      '#E74C3C',
  MITIGATED: '#F59E0B',
  CLOSED:    '#10B981',
}

const SEVERITY_COLOURS = {
  HIGH:   '#EF4444',
  MEDIUM: '#F59E0B',
  LOW:    '#10B981',
}

// mock data
const MOCK_STATS = {
  totalRisks:   30,
  highSeverity:  8,
  openRisks:    14,
  mitigated:    10,
  byCategory: [
    { name: 'Operational',  count: 8 },
    { name: 'Financial',    count: 6 },
    { name: 'Strategic',    count: 5 },
    { name: 'Compliance',   count: 4 },
    { name: 'Reputational', count: 3 },
    { name: 'Technical',    count: 3 },
    { name: 'Other',        count: 1 },
  ],
  byStatus: [
    { name: 'OPEN',      count: 14 },
    { name: 'MITIGATED', count: 10 },
    { name: 'CLOSED',    count:  6 },
  ],
  bySeverity: [
    { name: 'HIGH',   count:  8 },
    { name: 'MEDIUM', count: 13 },
    { name: 'LOW',    count:  9 },
  ],
}

const MOCK_MONTHLY = [
  { month: 'Nov 24', count: 2 },
  { month: 'Dec 24', count: 4 },
  { month: 'Jan 25', count: 5 },
  { month: 'Feb 25', count: 7 },
  { month: 'Mar 25', count: 6 },
  { month: 'Apr 25', count: 6 },
]

// helpers
function buildMonthlyData(risks) {
  if (!risks?.length) return []
  const map = {}
  risks.forEach(r => {
    if (!r.createdDate) return
    const d     = new Date(r.createdDate)
    const label = d.toLocaleDateString('en-GB', {
      month: 'short', year: '2-digit',
    })
    map[label] = (map[label] ?? 0) + 1
  })
  return Object.entries(map)
    .sort(([a], [b]) => {
      const parse = s => new Date('01 ' + s)
      return parse(a) - parse(b)
    })
    .map(([month, count]) => ({ month, count }))
}

function buildPieData(arr) {
  if (!arr?.length) return []
  const total = arr.reduce((s, i) => s + i.count, 0)
  return arr.map((item, i) => ({
    name:    item.name,
    value:   item.count,
    fill:    STATUS_COLOURS[item.name]
          ?? SEVERITY_COLOURS[item.name]
          ?? CATEGORY_COLOURS[i % CATEGORY_COLOURS.length],
    percent: total ? Math.round((item.count / total) * 100) : 0,
  }))
}

// sub-components
function KpiCard({ label, value, icon, textColour, bgColour, loading, trend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${bgColour} rounded-xl flex items-center
                         justify-center text-lg shrink-0`}>
          {icon}
        </div>
        {trend != null && !loading && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${trend >= 0
              ? 'bg-red-50 text-red-600'
              : 'bg-green-50 text-green-600'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`text-3xl font-bold ${textColour} leading-none mb-1`}>
            {value ?? '—'}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            {label}
          </p>
        </>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, children, loading, action, height = 280 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {loading ? (
        <div className="bg-gray-50 rounded-xl animate-pulse flex items-center
                        justify-center"
          style={{ height }}>
          <div className="text-center">
            <div className="flex gap-1 justify-center mb-2">
              {[0, 1, 2].map(i => (
                <div key={i}
                  className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-xs text-gray-400">Loading chart...</p>
          </div>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  )
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {[
        { key: '3m',  label: '3M'  },
        { key: '6m',  label: '6M'  },
        { key: 'all', label: 'All' },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition
                      ${value === key
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg
                    px-4 py-3 text-sm min-w-[120px]">
      <p className="font-semibold text-gray-700 mb-1 text-xs uppercase
                    tracking-wide">
        {label}
      </p>
      <p style={{ color: payload[0]?.fill }}>
        Risks:{' '}
        <span className="font-bold text-gray-800">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg
                    px-3 py-2.5 text-xs min-w-[120px]">
      <p className="font-bold mb-1" style={{ color: d.payload.fill }}>
        {d.name}
      </p>
      <p className="text-gray-600">
        Count: <strong className="text-gray-800">{d.value}</strong>
      </p>
      <p className="text-gray-500">
        Share: <strong>{d.payload.percent}%</strong>
      </p>
    </div>
  )
}

function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg
                    px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-primary">
        New Risks:{' '}
        <span className="font-bold text-gray-800">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

function EmptyChart({ message = 'No data available' }) {
  return (
    <div className="h-full flex flex-col items-center justify-center
                    text-gray-400 gap-2">
      <svg className="w-10 h-10 text-gray-200" fill="none"
        stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0
             01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

function StatusProgressRow({ item, total }) {
  const pct    = total ? Math.round((item.count / total) * 100) : 0
  const colour = STATUS_COLOURS[item.name] ?? '#1B4F8A'
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: colour }} />
          <span className="text-sm text-gray-700 font-medium">
            {item.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-800">
            {item.count}
          </span>
          <span className="text-xs text-gray-400 w-8 text-right">
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  )
}

//  main component 
export default function AnalyticsPage() {
  const navigate   = useNavigate()
  const { logout } = useAuth()

  const [stats,     setStats]     = useState(null)
  const [allRisks,  setAllRisks]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [period,    setPeriod]    = useState('6m')
  const [exporting, setExporting] = useState(false)
  const [chartView, setChartView] = useState('category')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [statsRes, risksRes] = await Promise.allSettled([
      getRiskStats(),
      getAllRisks(0, 500, 'createdDate', 'asc'),
    ])

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data)
      setUsingMock(false)
    } else {
      setStats(MOCK_STATS)
      setUsingMock(true)
    }

    if (risksRes.status === 'fulfilled') {
      const raw  = risksRes.value.data
      const list = raw?.content ?? (Array.isArray(raw) ? raw : [])
      setAllRisks(list)
    } else {
      setAllRisks([])
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    setExporting(true)
    try {
      const res  = await exportRisksCSV()
      const url  = window.URL.createObjectURL(new Blob([res.data]))
      const a    = document.createElement('a')
      a.href     = url
      a.download = `risks-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const allMonthly = usingMock
    ? MOCK_MONTHLY
    : buildMonthlyData(allRisks)

  const filteredMonthly =
    period === '3m'  ? allMonthly.slice(-3) :
    period === '6m'  ? allMonthly.slice(-6) :
                       allMonthly

  const pieStatusData   = buildPieData(stats?.byStatus   ?? [])
  const pieSeverityData = buildPieData(stats?.bySeverity ?? [])

  const barData =
    chartView === 'severity' ? stats?.bySeverity ?? [] :
    chartView === 'status'   ? stats?.byStatus   ?? [] :
                               stats?.byCategory ?? []

  const getBarColour = (entry, index) => {
    if (chartView === 'severity') return SEVERITY_COLOURS[entry.name] ?? '#1B4F8A'
    if (chartView === 'status')   return STATUS_COLOURS[entry.name]   ?? '#1B4F8A'
    return CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]
  }

  const totalRisks = stats?.totalRisks ?? 0

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/*Navbar — no props needed, uses useNavigate + useAuth internally */}
      <Navbar />

      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center
                        sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Analytics</h2>
            <p className="text-sm text-gray-500 mt-1">
              Risk trends, distribution charts and AI report generation
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 text-gray-600
                         text-sm font-medium rounded-xl hover:bg-gray-50
                         disabled:opacity-40 transition flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0
                     0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357
                     2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2.5 bg-primary text-white text-sm font-medium
                         rounded-xl hover:opacity-90 disabled:opacity-50
                         transition flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none"
                    viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor"
                    strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4
                         4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Mock warning ── */}
        {usingMock && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200
                          text-amber-800 rounded-xl text-sm flex items-center
                          gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none"
              stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948
                   3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949
                   3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12
                   15.75h.007v.008H12v-.008z" />
            </svg>
            <span>
              <strong>Demo data shown</strong> — backend not reachable.
              Connect the backend on port 8080 to see live analytics.
            </span>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Risks"   value={stats?.totalRisks}
            icon="📋" textColour="text-primary"    bgColour="bg-blue-50"
            loading={loading} />
          <KpiCard label="High Severity" value={stats?.highSeverity}
            icon="🔴" textColour="text-red-600"    bgColour="bg-red-50"
            loading={loading} trend={stats?.highSeverity} />
          <KpiCard label="Open Risks"    value={stats?.openRisks}
            icon="⚠️" textColour="text-yellow-600" bgColour="bg-yellow-50"
            loading={loading} />
          <KpiCard label="Mitigated"     value={stats?.mitigated}
            icon="✅" textColour="text-green-600"  bgColour="bg-green-50"
            loading={loading} />
        </div>

        {/* ── Row 1: BarChart + Status breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ChartCard
              title="Risk Distribution"
              subtitle={`Showing risks by ${chartView}`}
              loading={loading}
              height={300}
              action={
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  {[
                    { key: 'category', label: 'Category' },
                    { key: 'severity', label: 'Severity' },
                    { key: 'status',   label: 'Status'   },
                  ].map(({ key, label }) => (
                    <button key={key}
                      onClick={() => setChartView(key)}
                      className={`px-3 py-1.5 text-xs font-semibold
                                  rounded-lg transition
                        ${chartView === key
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}
                    margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                    barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"
                      vertical={false} />
                    <XAxis dataKey="name"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false} tickLine={false}
                      allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="count" name="Risks" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={getBarColour(entry, index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200
                          shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Status Breakdown
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Progress toward risk resolution
            </p>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-2 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(stats?.byStatus ?? []).map(item => (
                  <StatusProgressRow
                    key={item.name}
                    item={item}
                    total={totalRisks}
                  />
                ))}
              </div>
            )}
            {!loading && totalRisks > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(((stats?.mitigated ?? 0) / totalRisks) * 100)}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  of risks mitigated or closed
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 2: AreaChart + Pie by status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard
            title="Risks Over Time"
            subtitle="New risks registered per month"
            loading={loading}
            height={260}
            action={<PeriodSelector value={period} onChange={setPeriod} />}
          >
            {filteredMonthly.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredMonthly}
                  margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1B4F8A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1B4F8A" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"
                    vertical={false} />
                  <XAxis dataKey="month"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Area type="monotone" dataKey="count" name="New Risks"
                    stroke="#1B4F8A" strokeWidth={2.5}
                    fill="url(#lineGrad)"
                    dot={{ fill: '#1B4F8A', r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No monthly data available" />}
          </ChartCard>

          <ChartCard
            title="Status Distribution"
            subtitle="Risk counts by current status"
            loading={loading}
            height={260}
          >
            {pieStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieStatusData} cx="50%" cy="45%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>
                    )} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>
        </div>

        {/* ── Row 3: Pie by severity + Severity summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard
            title="Severity Distribution"
            subtitle="HIGH · MEDIUM · LOW breakdown"
            loading={loading}
            height={260}
          >
            {pieSeverityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieSeverityData} cx="50%" cy="45%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieSeverityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>
                    )} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartCard>

          <div className="bg-white rounded-2xl border border-gray-200
                          shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Severity Summary
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Risk count by severity level
            </p>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i}
                    className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.bySeverity ?? []).map(item => {
                  const colour = SEVERITY_COLOURS[item.name] ?? '#1B4F8A'
                  const pct    = totalRisks
                    ? Math.round((item.count / totalRisks) * 100)
                    : 0
                  return (
                    <div key={item.name}
                      className="flex items-center gap-4 p-4 rounded-xl
                                 border border-gray-100 hover:border-gray-200
                                 transition">
                      <div className="w-10 h-10 rounded-xl flex items-center
                                      justify-center text-white text-sm
                                      font-bold shrink-0"
                        style={{ backgroundColor: colour }}>
                        {item.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-700">
                            {item.name}
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {item.count}
                            <span className="text-xs text-gray-400 font-normal ml-1">
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: colour }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── AI Report Streamer ── */}
        <div className="mb-2">
          <ReportStreamer riskData={null} />
        </div>

      </div>
    </div>
  )
}