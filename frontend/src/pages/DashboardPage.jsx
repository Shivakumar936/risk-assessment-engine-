import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRiskStats } from '../services/riskService'
import Navbar from '../components/Navbar'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const CATEGORY_COLOURS = [
  '#1B4F8A','#2E86C1','#1ABC9C',
  '#F39C12','#E74C3C','#8E44AD','#27AE60',
]

const STATUS_COLOURS = {
  OPEN:      '#E74C3C',
  MITIGATED: '#F59E0B',
  CLOSED:    '#10B981',
}

const SEVERITY_COLOURS = {
  HIGH:   '#E74C3C',
  MEDIUM: '#F59E0B',
  LOW:    '#10B981',
}

const MOCK_STATS = {
  totalRisks: 30, highSeverity: 8, openRisks: 14, mitigated: 10,
  byCategory: [
    { name: 'Operational', count: 8 },
    { name: 'Financial',   count: 6 },
    { name: 'Strategic',   count: 5 },
    { name: 'Compliance',  count: 4 },
    { name: 'Technical',   count: 3 },
    { name: 'Other',       count: 4 },
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

// sub-components 

function KpiCard({ label, value, icon, textColour, bgColour, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200
                    shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${bgColour} rounded-xl flex items-center
                         justify-center text-lg shrink-0`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-14 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`text-2xl sm:text-3xl font-bold ${textColour}
                         leading-none mb-1`}>
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg
                    px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p style={{ color: payload[0]?.fill }}>
        Risks: <span className="font-bold">{payload[0]?.value}</span>
      </p>
    </div>
  )
}

//  main component 

export default function DashboardPage() {
  const navigate = useNavigate()

  const [stats,     setStats]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [chartView, setChartView] = useState('category')

  useEffect(() => {
    getRiskStats()
      .then(res => { setStats(res.data); setUsingMock(false) })
      .catch(()  => { setStats(MOCK_STATS); setUsingMock(true) })
      .finally(()  => setLoading(false))
  }, [])

  const barData =
    chartView === 'status'   ? stats?.byStatus   ?? [] :
    chartView === 'severity' ? stats?.bySeverity ?? [] :
                               stats?.byCategory ?? []

  function getBarColour(entry, index) {
    if (chartView === 'status')   return STATUS_COLOURS[entry.name]   ?? '#1B4F8A'
    if (chartView === 'severity') return SEVERITY_COLOURS[entry.name] ?? '#1B4F8A'
    return CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      <Navbar navigate={navigate} />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center
                        sm:justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Risk overview and key indicators
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/risks/new')}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-primary
                         text-white text-sm font-medium rounded-xl
                         hover:opacity-90 transition"
            >
              + New Risk
            </button>
            <button
              onClick={() => navigate('/risks')}
              className="flex-1 sm:flex-none px-4 py-2.5 border
                         border-gray-200 text-gray-600 text-sm font-medium
                         rounded-xl hover:bg-gray-50 transition"
            >
              View All
            </button>
          </div>
        </div>

        {/* ── Mock data warning ── */}
        {usingMock && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200
                          text-amber-800 rounded-xl text-sm flex items-center
                          gap-2">
            <span>⚠</span>
            <span>Demo data shown — connect backend for live data.</span>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4
                        mb-6 sm:mb-8">
          <KpiCard
            label="Total Risks"   value={stats?.totalRisks}
            icon="📋" textColour="text-primary"    bgColour="bg-blue-50"
            loading={loading}
          />
          <KpiCard
            label="High Severity" value={stats?.highSeverity}
            icon="🔴" textColour="text-red-600"    bgColour="bg-red-50"
            loading={loading}
          />
          <KpiCard
            label="Open Risks"    value={stats?.openRisks}
            icon="⚠️" textColour="text-yellow-600" bgColour="bg-yellow-50"
            loading={loading}
          />
          <KpiCard
            label="Mitigated"     value={stats?.mitigated}
            icon="✅" textColour="text-green-600"  bgColour="bg-green-50"
            loading={loading}
          />
        </div>

        {/* ── Chart + status breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">

          {/* bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border
                          border-gray-200 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center
                            sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Risk Distribution
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  By {chartView}
                </p>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1
                              self-start sm:self-auto">
                {['category', 'status', 'severity'].map(v => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium
                                rounded-lg transition capitalize
                                ${chartView === v
                                  ? 'bg-white text-primary shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="h-52 sm:h-64 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                  barSize={32}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Risks" radius={[5, 5, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={getBarColour(entry, i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200
                          shadow-sm p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">
              Status Breakdown
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Risk resolution progress
            </p>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-2 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(stats?.byStatus ?? []).map(item => {
                  const total = stats?.totalRisks || 1
                  const pct   = Math.round((item.count / total) * 100)
                  const col   = STATUS_COLOURS[item.name] ?? '#1B4F8A'
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: col }}
                          />
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">
                            {item.count}
                          </span>
                          <span className="text-xs text-gray-400 w-7 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: col }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* quick actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase
                            tracking-wider mb-3">
                Quick Actions
              </p>
              {[
                {
                  label: 'View Risk Register',
                  path:  '/risks',
                  style: 'bg-primary text-white hover:opacity-90',
                },
                {
                  label: '+ New Risk',
                  path:  '/risks/new',
                  style: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                },
                {
                  label: 'Analytics',
                  path:  '/analytics',
                  style: 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                },
              ].map(({ label, path, style }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`w-full py-2.5 text-sm font-medium rounded-xl
                              transition ${style}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}