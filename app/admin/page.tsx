'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TEXAS_COUNTIES } from '@/lib/counties.mjs';

type AppRole = 'agent' | 'manager' | 'both';

interface Agent { id: number; name: string; email: string; code: string; role: AppRole; counties: string[]; created_at: string; }

interface AgentForm {
  name: string;
  code: string;
  email: string;
  role: AppRole;
  counties: string[];
}

const EMPTY_FORM: AgentForm = { name: '', code: '', email: '', role: 'agent', counties: [] };

export default function AdminPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);

  const load = useCallback(() => {
    fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/admin')
      .then(r => r.status === 401 ? (router.push('/post-login'), null) : r.json())
      .then(data => { if (data) { setAgents(data.agents); setLoading(false); } });
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditAgent(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (a: Agent) => {
    setEditAgent(a);
    setForm({ name: a.name, code: a.code, email: a.email, role: a.role, counties: a.counties ?? [] });
    setShowForm(true);
  };

  const addCounty = (county: string) => {
    if (!county) return;
    setForm(previous => previous.counties.includes(county)
      ? previous
      : { ...previous, counties: [...previous.counties, county] });
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const counties = form.role === 'manager' ? [] : form.counties;
    if (form.role !== 'manager' && counties.length === 0) {
      setSaving(false);
      setMsg('Assign at least one county to an Agent account.');
      return;
    }

    const submittedForm = { ...form, counties };
    const res = await fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/admin', {
      method: editAgent ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editAgent ? { ...submittedForm, id: editAgent.id } : submittedForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg(data.error); return; }
    setMsg(editAgent ? 'Agent updated!' : 'Agent added!');
    setShowForm(false);
    load();
  };

  const handleDelete = async (a: Agent) => {
    if (!confirm(`Delete agent ${a.name}? Their submissions and saved contact emails will also be deleted.`)) return;
    await fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + '/api/admin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id }) });
    load();
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-indigo-600 font-semibold">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 text-white px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl">Direct Contacts</h1>
          <p className="text-indigo-200 text-sm">Admin Panel</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/manager')} className="bg-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500">← Dashboard</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {msg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-medium">{msg}</div>}

        {/* Agents */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Agents</h2>
              <p className="text-gray-400 text-sm">Add, edit or remove agents</p>
            </div>
            <button onClick={openAdd} className="bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-800 flex items-center gap-2">
              <span className="text-lg leading-none">+</span> Add Agent
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {agents.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 font-bold text-lg">{a.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{a.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-mono text-sm text-gray-500">{a.code}</span>
                    <span className="text-xs text-gray-400">{a.email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.role === 'manager' ? 'bg-purple-100 text-purple-700' : a.role === 'both' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                      {a.role === 'both' ? 'agent + manager' : a.role}
                    </span>
                  </div>
                  {a.role !== 'manager' && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(a.counties ?? []).map(county => (
                        <span key={county} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {county} County
                        </span>
                      ))}
                      {!a.counties?.length && <span className="text-xs text-red-500">No county assigned</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="border-2 border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-bold hover:border-indigo-300 hover:text-indigo-600">Edit</button>
                  {a.role === 'agent' && (
                    <button onClick={() => handleDelete(a)} className="border-2 border-red-100 text-red-500 px-3 py-2 rounded-xl text-sm font-bold hover:border-red-300 hover:bg-red-50">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>



      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-5">{editAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Jane Smith"
                  style={{ color: '#111827' }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Agent Code</label>
                <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. JANE-S"
                  style={{ color: '#111827' }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base font-mono focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Sign-in Email (Microsoft / Azure AD)</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. jane.smith@pvamu.edu"
                  style={{ color: '#111827' }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-400" />
                <p className="text-xs text-gray-400 mt-1">Must match the email on their PVAMU Microsoft account — this is how they sign in, no password needed.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as AppRole }))}
                  style={{ color: '#111827' }}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-400">
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="both">Agent + Manager</option>
                </select>
              </div>
              {form.role !== 'manager' && (
                <div>
                  <label htmlFor="county-select" className="block text-sm font-bold text-gray-700 mb-1.5">Assigned Counties</label>
                  <select
                    id="county-select"
                    value=""
                    onChange={event => addCounty(event.target.value)}
                    style={{ color: '#111827' }}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">Select a Texas county...</option>
                    {TEXAS_COUNTIES.filter(county => !form.counties.includes(county)).map(county => (
                      <option key={county} value={county}>{county} County</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">Choose every Texas county this Agent serves. Select another county to add more.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.counties.map(county => (
                      <span key={county} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {county} County
                        <button
                          type="button"
                          onClick={() => setForm(previous => ({ ...previous, counties: previous.counties.filter(item => item !== county) }))}
                          aria-label={`Remove ${county}`}
                          className="text-blue-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {!form.counties.length && <span className="text-xs text-gray-400">No counties added yet.</span>}
                  </div>
                </div>
              )}
              {msg && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{msg}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setMsg(''); }} className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-700 text-white py-3 rounded-xl font-bold hover:bg-indigo-800 disabled:opacity-50">
                {saving ? 'Saving...' : editAgent ? 'Save Changes' : 'Add Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
