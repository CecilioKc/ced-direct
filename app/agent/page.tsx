'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ReportData {
  total: number;
  race: { race: string; count: number }[];
  age: { age_group: string; count: number }[];
  sex: { sex: string; count: number }[];
  county: { county: string; count: number }[];
  trend: { month: string; count: number }[];
  contact: { contact_method: string; count: number }[];
}

const MONTHS = Array.from({ length: 5 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return {
    value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
});

const PURPLE = '#4F2D7F';
const GOLD = '#FFB81C';

export default function AgentPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<{ name: string; code: string; id: number } | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchReport = useCallback(async (month: string, county: string) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (county) params.set('county', county);
    const url = params.toString() ? `/api/reports?${params}` : '/api/reports';
    const res = await fetch(url);
    if (res.status === 401) { router.push('/'); return; }
    const data = await res.json();
    setReport(data);
  }, [router]);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then(r => r.status === 401 ? null : r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([reportData, agentData]) => {
      if (!reportData) { router.push('/'); return; }
      setReport(reportData);
      if (agentData) setAgent(agentData);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!loading) fetchReport(selectedMonth, selectedCounty);
  }, [selectedMonth, selectedCounty, fetchReport, loading]);

  const generateQR = async () => {
    if (!agent) return;
    setQrLoading(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const surveyUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) + `/survey/${agent.id}`;
      const url = await QRCode.toDataURL(surveyUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#4F2D7F', light: '#FFFFFF' },
      });
      setQrUrl(url);
      setShowQR(true);
    } catch (e) {
      console.error('QR error:', e);
      alert('Failed to generate QR code.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/');
  };

  const Bar = ({ count, total, color }: { count: number; total: number; color: string }) => (
    <div className="w-full bg-gray-100 rounded-full h-3">
      <div className="h-3 rounded-full transition-all" style={{ width: `${Math.round((count / (total || 1)) * 100)}%`, backgroundColor: color }} />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: GOLD }}>
            <svg className="w-8 h-8" style={{ color: PURPLE }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <p className="font-semibold" style={{ color: PURPLE }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const countyOptions = (report?.county ?? []).filter(c => c.county).map(c => c.county);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav style={{ backgroundColor: PURPLE }} className="text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GOLD }}>
            <svg className="w-6 h-6" style={{ color: PURPLE }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">CED-Direct</h1>
            <p className="text-xs leading-tight" style={{ color: '#ffd166' }}>Agent Dashboard — {agent?.name ?? '...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {agent && (
            <button onClick={generateQR} disabled={qrLoading}
              style={{ backgroundColor: GOLD, color: PURPLE }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
              {qrLoading ? 'Generating...' : '📱 My QR Code'}
            </button>
          )}
          <button onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-white/30 hover:bg-white/10 transition">
            Logout
          </button>
        </div>
      </nav>

      {/* Gold accent bar */}
      <div className="h-1" style={{ backgroundColor: GOLD }} />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-wrap items-center gap-4">
          <label className="text-sm font-bold" style={{ color: PURPLE }}>Filter by month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ color: '#111827', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
            className="border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none">
            <option value="">Last 5 months</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <label className="text-sm font-bold" style={{ color: PURPLE }}>Filter by county:</label>
          <select value={selectedCounty} onChange={e => setSelectedCounty(e.target.value)}
            style={{ color: '#111827', backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
            className="border-2 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none">
            <option value="">All counties</option>
            {countyOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={() => window.print()}
            style={{ backgroundColor: PURPLE }}
            className="ml-auto text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition">
            Export / Print Report
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 col-span-2 md:col-span-1 border-t-4" style={{ borderColor: PURPLE }}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total Contacts</p>
            <p className="text-5xl font-bold mt-2" style={{ color: PURPLE }}>{report?.total ?? 0}</p>
          </div>
          {report?.trend.slice(-3).map(t => (
            <div key={t.month} className="bg-white rounded-xl shadow-sm p-6 border-t-4" style={{ borderColor: GOLD }}>
              <p className="text-xs font-bold text-gray-500">{t.month}</p>
              <p className="text-3xl font-bold mt-2 text-gray-800">{t.count}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: 'Race / Ethnicity', data: report?.race.filter(r => r.race) ?? [], labelKey: 'race', color: PURPLE },
            { title: 'Age Groups', data: report?.age.filter(a => a.age_group) ?? [], labelKey: 'age_group', color: '#6b42a8' },
            { title: 'Sex', data: report?.sex.filter(s => s.sex) ?? [], labelKey: 'sex', color: GOLD },
            { title: 'County', data: report?.county.filter(c => c.county) ?? [], labelKey: 'county', color: '#2f7d4f' },
            { title: 'Preferred Contact Method', data: report?.contact.filter(c => c.contact_method) ?? [], labelKey: 'contact_method', color: '#e6a100' },
          ].map(({ title, data, labelKey, color }) => (
            <div key={title} className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold mb-4 text-base flex items-center gap-2" style={{ color: PURPLE }}>
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                {title}
              </h3>
              <div className="space-y-3">
                {(data as any[]).map((r: any) => (
                  <div key={r[labelKey]}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{r[labelKey]}</span>
                      <span className="font-bold text-gray-800">{r.count} ({Math.round((r.count / (report?.total || 1)) * 100)}%)</span>
                    </div>
                    <Bar count={r.count} total={report?.total ?? 1} color={color} />
                  </div>
                ))}
                {!data.length && <p className="text-gray-400 text-sm">No data yet</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: GOLD }}>
              <svg className="w-6 h-6" style={{ color: PURPLE }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: PURPLE }}>Your Survey QR Code</h2>
            <p className="text-gray-500 text-sm mb-2">Agent: <span className="font-bold" style={{ color: PURPLE }}>{agent?.name}</span></p>
            <p className="text-gray-400 text-xs mb-5">Participants scan this after your interaction</p>
            {qrUrl && (
              <div className="p-3 rounded-2xl inline-block" style={{ border: `4px solid ${GOLD}` }}>
                <img src={qrUrl} alt="QR Code" className="rounded-xl" />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3 break-all">{typeof window !== 'undefined' ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/survey/${agent?.id}` : ''}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowQR(false)}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">
                Close
              </button>
              <a href={qrUrl} download={`qr-${agent?.code}.png`}
                style={{ backgroundColor: PURPLE }}
                className="flex-1 text-white py-3 rounded-xl font-bold hover:opacity-90 text-center">
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
