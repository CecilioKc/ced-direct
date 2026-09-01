'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface Agent {
  id: number;
  name: string;
  code: string;
}

interface ReportData {
  total: number;
  race: { race: string; count: number }[];
  age: { age_group: string; count: number }[];
  sex: { sex: string; count: number }[];
  county: { county: string; count: number }[];
  trend: { month: string; count: number }[];
  contact: { contact_method: string; count: number }[];
  agentSummary: { name: string; code: string; count: number }[] | null;
}

const MONTHS = Array.from({ length: 5 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
});

interface ChartDatum {
  label: string;
  count: number;
}

function BarChart({ data, color }: { data: ChartDatum[]; color: string }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="space-y-2">
      {data.filter(row => row.label).map((row) => (
        <div key={row.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">{row.label}</span>
            <span className="font-semibold text-gray-800">
              {row.count} ({total ? Math.round((row.count / total) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`${color} h-2 rounded-full transition-all`}
              style={{ width: `${total ? Math.round((row.count / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      ))}
      {!data.some(row => row.label) && <p className="text-gray-400 text-sm">No data yet</p>}
    </div>
  );
}

export default function ManagerPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'agent' | 'manager' | 'both' | null>(null);

  const fetchReport = useCallback(async (agentId: string, month: string, county: string) => {
    const params = new URLSearchParams();
    if (agentId) params.set('agentId', agentId);
    if (month) params.set('month', month);
    if (county) params.set('county', county);
    const res = await fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + `/api/reports?${params}`);
    if (res.status === 401) { router.push('/post-login'); return; }
    const data = await res.json();
    setReport(data);
  }, [router]);

  useEffect(() => {
    Promise.all([
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/agents').then(r => r.ok ? r.json() : null),
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/reports').then(r => r.ok ? r.json() : null),
      fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([agentData, reportData, currentUser]) => {
      if (!currentUser || !['manager', 'both'].includes(currentUser.role)) {
        router.push('/post-login');
        return;
      }
      if (agentData) setAgents(agentData.agents);
      if (reportData) setReport(reportData);
      if (currentUser) setCurrentUserRole(currentUser.role);
      setLoading(false);
    }).catch(() => router.push('/'));
  }, [router]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/` });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-indigo-600 font-semibold">Loading manager dashboard...</div>
      </div>
    );
  }

  const countyOptions = (report?.county ?? []).filter(c => c.county).map(c => c.county);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav style={{ backgroundColor: '#4F2D7F' }} className="text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="font-bold text-lg">Direct Contacts</h1>
          <p className="text-indigo-200 text-xs">Manager Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUserRole === 'both' && (
            <button
              onClick={() => router.push('/agent')}
              className="border-2 border-white/30 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition"
            >
              Agent View
            </button>
          )}
          <button
            onClick={() => router.push('/admin')}
            className="bg-white text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-50 transition"
          >
              Admin Panel
          </button>
          <button
            onClick={handleLogout}
            className="bg-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Agent:</label>
            <select
              value={selectedAgent}
              onChange={e => {
                const agentId = e.target.value;
                setSelectedAgent(agentId);
                void fetchReport(agentId, selectedMonth, selectedCounty);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Month:</label>
            <select
              value={selectedMonth}
              onChange={e => {
                const month = e.target.value;
                setSelectedMonth(month);
                void fetchReport(selectedAgent, month, selectedCounty);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Last 5 months</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">County:</label>
            <select
              value={selectedCounty}
              onChange={e => {
                const county = e.target.value;
                setSelectedCounty(county);
                void fetchReport(selectedAgent, selectedMonth, county);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Counties</option>
              {countyOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => window.print()}
            style={{ backgroundColor: '#4F2D7F' }}
            className="ml-auto text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
          >
            Export / Print
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Contacts</p>
            <p className="text-4xl font-bold text-indigo-700 mt-1">{report?.total ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active Agents</p>
            <p className="text-4xl font-bold text-purple-600 mt-1">{agents.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Avg per Agent</p>
            <p className="text-4xl font-bold text-teal-600 mt-1">
              {agents.length ? Math.round((report?.total ?? 0) / agents.length) : 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide">This Month</p>
            <p className="text-4xl font-bold text-amber-600 mt-1">
              {report?.trend.at(-1)?.count ?? 0}
            </p>
          </div>
        </div>

        {/* Agent Summary Table */}
        {report?.agentSummary && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Agent Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-500 font-medium">Agent</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Code</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Contacts</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.agentSummary.map((a, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const agent = agents.find(ag => ag.code === a.code);
                        if (agent) {
                          const agentId = String(agent.id);
                          setSelectedAgent(agentId);
                          void fetchReport(agentId, selectedMonth, selectedCounty);
                        }
                      }}
                    >
                      <td className="py-3 font-medium text-indigo-700">{a.name}</td>
                      <td className="py-3 text-gray-500 font-mono text-xs">{a.code}</td>
                      <td className="py-3 font-bold">{a.count}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-indigo-500 h-1.5 rounded-full"
                              style={{ width: `${report.total ? Math.round((a.count / report.total) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {report.total ? Math.round((a.count / report.total) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Demographics Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Race / Ethnicity</h3>
            <BarChart data={(report?.race ?? []).map(row => ({ label: row.race, count: row.count }))} color="bg-indigo-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Age Groups</h3>
            <BarChart data={(report?.age ?? []).map(row => ({ label: row.age_group, count: row.count }))} color="bg-purple-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Sex</h3>
            <BarChart data={(report?.sex ?? []).map(row => ({ label: row.sex, count: row.count }))} color="bg-teal-500" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">County</h3>
            <BarChart data={(report?.county ?? []).map(row => ({ label: row.county, count: row.count }))} color="bg-green-600" />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Preferred Contact Method</h3>
            <BarChart data={(report?.contact ?? []).map(row => ({ label: row.contact_method, count: row.count }))} color="bg-amber-500" />
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Trend</h3>
          <div className="flex items-end gap-3 h-32">
            {report?.trend.map((t, i) => {
              const max = Math.max(...(report?.trend.map(x => x.count) ?? [1]));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{t.count}</span>
                  <div
                    className="w-full bg-indigo-500 rounded-t-md transition-all"
                    style={{ height: `${max ? Math.round((t.count / max) * 80) + 8 : 8}px` }}
                  />
                  <span className="text-xs text-gray-500">{t.month.slice(5)}</span>
                </div>
              );
            })}
            {!report?.trend.length && <p className="text-gray-400 text-sm">No trend data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
