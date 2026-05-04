import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';

export default function Trainers() {
  const { t } = useLanguage();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    setLoading(true);
    const { data } = await supabase.from('trainers').select('id, username, full_name, created_at').order('created_at', { ascending: false });
    setTrainers(data || []);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.full_name) return;
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('trainers').insert({
      username: form.username,
      password: form.password,
      full_name: form.full_name
    });

    if (err) {
      setError(err.code === '23505' ? 'Username already exists' : err.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    setForm({ username: '', password: '', full_name: '' });
    fetchTrainers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trainer?')) return;
    await supabase.from('trainers').delete().eq('id', id);
    fetchTrainers();
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trainers Management</h1>
          <p className="text-muted">Manage trainer accounts for the platform.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Trainer
        </button>
      </div>

      <div className="card">
        {trainers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No trainers found</h3>
            <p>Create a trainer account to assign them to trainings.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.full_name}</td>
                    <td>{t.username}</td>
                    <td className="text-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Trainer</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreate}>
              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
              
              <div className="form-group">
                <label>Full Name *</label>
                <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              
              <div className="form-group">
                <label>Username *</label>
                <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="e.g. john_doe" />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input required type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Secure password" />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner spinner-sm" /> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
