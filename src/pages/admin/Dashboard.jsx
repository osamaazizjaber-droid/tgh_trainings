import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';
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
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    projects: 0, activities: 0, trainings: 0, users: 0, attendance: 0, evaluations: 0,
  });
  const [recentTrainings, setRecentTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const trainerId = localStorage.getItem('trainer_id');

  const [projectsList, setProjectsList] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');

  useEffect(() => {
    supabase.from('projects').select('id, name').order('created_at').then(({ data }) => setProjectsList(data || []));
  }, []);

  useEffect(() => {
    if (selectedProject) {
      supabase.from('activities').select('id, name').eq('project_id', selectedProject).order('created_at').then(({ data }) => setActivitiesList(data || []));
    } else {
      setActivitiesList([]);
    }
    setSelectedActivity('');
  }, [selectedProject]);

  useEffect(() => {
    fetchStats(selectedProject, selectedActivity);
  }, [selectedProject, selectedActivity]);

  const fetchStats = async (projId, actId) => {
    setLoading(true);
    try {
      if (!projId && !actId) {
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
          trainerId ? supabase.from('trainings').select('*', { count: 'exact', head: true }).eq('trainer_id', trainerId) : supabase.from('trainings').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('attendance').select('*', { count: 'exact', head: true }),
          supabase.from('evaluations').select('*', { count: 'exact', head: true }),
          trainerId ? supabase.from('trainings').select(`
            id, title, days_count, has_pre_test, has_post_test, has_evaluation, created_at, qr_expires_at,
            activities!inner(name, projects!inner(name))
          `).eq('trainer_id', trainerId).order('created_at', { ascending: false }).limit(5)
          : supabase.from('trainings').select(`
            id, title, days_count, has_pre_test, has_post_test, has_evaluation, created_at, qr_expires_at,
            activities!inner(name, projects!inner(name))
          `).order('created_at', { ascending: false }).limit(5),
        ]);
        setStats({ projects, activities, trainings, users, attendance, evaluations });
        setRecentTrainings(recent || []);
      } else {
        let trainingIds = [];
        let pCount = projId ? 1 : 0;
        let aCount = actId ? 1 : 0;

        if (actId) {
          let q = supabase.from('trainings').select('id').eq('activity_id', actId);
          if (trainerId) q = q.eq('trainer_id', trainerId);
          const { data: trs } = await q;
          trainingIds = (trs || []).map(t => t.id);
        } else if (projId) {
          const { data: acts } = await supabase.from('activities').select('id').eq('project_id', projId);
          aCount = acts?.length || 0;
          const actIds = (acts || []).map(a => a.id);
          if (actIds.length > 0) {
            let q = supabase.from('trainings').select('id').in('activity_id', actIds);
            if (trainerId) q = q.eq('trainer_id', trainerId);
            const { data: trs } = await q;
            trainingIds = (trs || []).map(t => t.id);
          }
        }

        const tCount = trainingIds.length;
        let attCount = 0;
        let evalCount = 0;
        let uCount = 0;

        if (tCount > 0) {
          const [{ count: ac }, { count: ec }, { data: attRecords }] = await Promise.all([
            supabase.from('attendance').select('*', { count: 'exact', head: true }).in('training_id', trainingIds),
            supabase.from('evaluations').select('*', { count: 'exact', head: true }).in('training_id', trainingIds),
            supabase.from('attendance').select('user_id').in('training_id', trainingIds)
          ]);
          attCount = ac || 0;
          evalCount = ec || 0;
          const uniqueUsers = new Set((attRecords || []).map(r => r.user_id));
          uCount = uniqueUsers.size;
        }

        let recentQuery = supabase.from('trainings').select(`
          id, title, days_count, has_pre_test, has_post_test, has_evaluation, created_at, qr_expires_at,
          activities!inner(name, projects!inner(name))
        `).order('created_at', { ascending: false }).limit(5);

        if (trainerId) recentQuery = recentQuery.eq('trainer_id', trainerId);

        if (actId) {
           recentQuery = recentQuery.eq('activity_id', actId);
        } else if (projId) {
           if (trainingIds.length > 0) {
             recentQuery = recentQuery.in('id', trainingIds);
           } else {
             recentQuery = recentQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
           }
        }

        const { data: recent } = await recentQuery;
        setStats({ projects: pCount, activities: aCount, trainings: tCount, users: uCount, attendance: attCount, evaluations: evalCount });
        setRecentTrainings(recent || []);
      }
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
        <span>{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade">
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{t('dashboard')}</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>
            {t('overview_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <select 
              style={{ width: 180, padding: '8px 12px', fontSize: '0.9rem' }}
              value={selectedProject} 
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">{t('all_projects') || 'All Projects'}</option>
              {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <select 
              style={{ width: 180, padding: '8px 12px', fontSize: '0.9rem' }}
              value={selectedActivity} 
              onChange={(e) => setSelectedActivity(e.target.value)}
              disabled={!selectedProject}
            >
              <option value="">{t('all_activities') || 'All Activities'}</option>
              {activitiesList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <Link to="/admin/projects" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('new_project')}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title={t('projects')} value={stats.projects} color="purple"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
        />
        <StatCard
          title={t('activities')} value={stats.activities} color="blue"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>}
        />
        <StatCard
          title={t('trainings')} value={stats.trainings} color="teal"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
        />
        <StatCard
          title={t('registered_users')} value={stats.users} color="green"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          title={t('attendance_records')} value={stats.attendance} color="yellow"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
        />
        <StatCard
          title={t('evaluations')} value={stats.evaluations} color="orange"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
        />
      </div>

      {/* Recent Trainings */}
      <div className="card" style={{ marginTop: 32 }}>
        <div className="card-header">
          <h2 className="card-title">{t('recent_trainings')}</h2>
          <Link to="/admin/projects" className="btn btn-ghost btn-sm">{t('view_all')}</Link>
        </div>

        {recentTrainings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>{t('no_trainings_yet')}</h3>
            <p>{t('get_started_desc')}</p>
            <Link to="/admin/projects" className="btn btn-primary" style={{ marginTop: 16 }}>
              {t('get_started')}
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('training')}</th>
                  <th>{t('activity')}</th>
                  <th>{t('project')}</th>
                  <th>{t('days')}</th>
                  <th>{t('features')}</th>
                  <th>{t('qr_status')}</th>
                  <th>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {recentTrainings.map((trainingItem) => (
                  <tr key={trainingItem.id}>
                    <td style={{ fontWeight: 600 }}>{trainingItem.title}</td>
                    <td className="text-muted">{trainingItem.activities?.name}</td>
                    <td className="text-muted">{trainingItem.activities?.projects?.name}</td>
                    <td>
                      <span className="badge badge-purple">{trainingItem.days_count} {t('days')}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {trainingItem.has_pre_test && <span className="badge badge-info">{t('pre_test')}</span>}
                        {trainingItem.has_post_test && <span className="badge badge-info">{t('post_test')}</span>}
                        {trainingItem.has_evaluation && <span className="badge badge-success">{t('eval')}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${isExpired(trainingItem.qr_expires_at) ? 'badge-danger' : 'badge-success'}`}>
                        {isExpired(trainingItem.qr_expires_at) ? `⚠ ${t('expired')}` : `✓ ${t('active')}`}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/trainings/${trainingItem.id}`} className="btn btn-secondary btn-sm">
                        {t('manage')}
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
