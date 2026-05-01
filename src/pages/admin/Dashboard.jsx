import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Dashboard.css';

const StatCard = ({ title, value, icon, color, sub }) => (
  <div className={`stat-card stat-card-${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-title">{title}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    activities: 0,
    trainings: 0,
    users: 0,
    attendance: 0,
    evaluations: 0,
  });
  const [recentTrainings, setRecentTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: projects },
        { count: activities },
        { count: trainings },
        { count: users },
        { count: attendance },
        { count: evaluations },
        { data: recent },
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('activities').select('*', { count: 'exact', head: true }),
        supabase.from('trainings').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('evaluations').select('*', { count: 'exact', head: true }),
        supabase.from('trainings').select(`
          id, title, days_count, has_pre_test, has_post_test, has_evaluation, created_at, qr_expires_at,
          activities!inner(name, projects!inner(name))
        `).order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({ projects, activities, trainings, users, attendance, evaluations });
      setRecentTrainings(recent || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (qr_expires_at) => {
    if (!qr_expires_at) return true;
    return new Date(qr_expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>
            Overview of your training management system
          </p>
        </div>
        <Link to="/admin/projects" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Projects" value={stats.projects} color="purple"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
        />
        <StatCard
          title="Activities" value={stats.activities} color="blue"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
        />
        <StatCard
          title="Trainings" value={stats.trainings} color="teal"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
        />
        <StatCard
          title="Registered Users" value={stats.users} color="green"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          title="Attendance Records" value={stats.attendance} color="yellow"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <StatCard
          title="Evaluations" value={stats.evaluations} color="orange"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        />
      </div>

      {/* Recent Trainings */}
      <div className="card" style={{ marginTop: 32 }}>
        <div className="card-header">
          <h2 className="card-title">Recent Trainings</h2>
          <Link to="/admin/projects" className="btn btn-ghost btn-sm">View all →</Link>
        </div>

        {recentTrainings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No trainings yet</h3>
            <p>Create a project and add trainings to get started.</p>
            <Link to="/admin/projects" className="btn btn-primary" style={{ marginTop: 16 }}>
              Get Started
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Training</th>
                  <th>Activity</th>
                  <th>Project</th>
                  <th>Days</th>
                  <th>Features</th>
                  <th>QR Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTrainings.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td className="text-muted">{t.activities?.name}</td>
                    <td className="text-muted">{t.activities?.projects?.name}</td>
                    <td>
                      <span className="badge badge-purple">{t.days_count} days</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {t.has_pre_test && <span className="badge badge-info">Pre-Test</span>}
                        {t.has_post_test && <span className="badge badge-info">Post-Test</span>}
                        {t.has_evaluation && <span className="badge badge-success">Eval</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${isExpired(t.qr_expires_at) ? 'badge-danger' : 'badge-success'}`}>
                        {isExpired(t.qr_expires_at) ? '⚠ Expired' : '✓ Active'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/trainings/${t.id}`} className="btn btn-secondary btn-sm">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
