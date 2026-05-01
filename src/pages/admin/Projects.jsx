import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/LanguageContext';

const emptyProject = { name: '', description: '' };
const emptyActivity = { name: '' };
const emptyTraining = {
  title: '',
  days_count: 1,
  has_pre_test: false,
  has_post_test: false,
  has_evaluation: true,
};

export default function AdminProjects() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [editingProject, setEditingProject] = useState(null);
  const [projectSaving, setProjectSaving] = useState(false);

  // Activity modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState(emptyActivity);
  const [activityProjectId, setActivityProjectId] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activitySaving, setActivitySaving] = useState(false);

  // Training modal
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainingForm, setTrainingForm] = useState(emptyTraining);
  const [trainingActivityId, setTrainingActivityId] = useState(null);
  const [trainingProjectId, setTrainingProjectId] = useState(null);
  const [trainingSaving, setTrainingSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, description, created_at,
        activities(
          id, name, created_at,
          trainings(id, title, days_count, has_pre_test, has_post_test, has_evaluation, qr_expires_at)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) setProjects(data || []);
    setLoading(false);
  };

  /* ── Project CRUD ── */
  const openNewProject = () => {
    setEditingProject(null);
    setProjectForm(emptyProject);
    setShowProjectModal(true);
  };

  const openEditProject = (p) => {
    setEditingProject(p);
    setProjectForm({ name: p.name, description: p.description || '' });
    setShowProjectModal(true);
  };

  const saveProject = async () => {
    if (!projectForm.name.trim()) return;
    setProjectSaving(true);
    if (editingProject) {
      await supabase.from('projects').update(projectForm).eq('id', editingProject.id);
    } else {
      await supabase.from('projects').insert(projectForm);
    }
    setProjectSaving(false);
    setShowProjectModal(false);
    fetchProjects();
  };

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    setDeleteTarget(null);
    fetchProjects();
  };

  /* ── Activity CRUD ── */
  const openNewActivity = (projectId) => {
    setEditingActivity(null);
    setActivityForm(emptyActivity);
    setActivityProjectId(projectId);
    setShowActivityModal(true);
  };

  const openEditActivity = (activity, projectId) => {
    setEditingActivity(activity);
    setActivityForm({ name: activity.name });
    setActivityProjectId(projectId);
    setShowActivityModal(true);
  };

  const saveActivity = async () => {
    if (!activityForm.name.trim()) return;
    setActivitySaving(true);
    if (editingActivity) {
      await supabase.from('activities').update(activityForm).eq('id', editingActivity.id);
    } else {
      await supabase.from('activities').insert({ ...activityForm, project_id: activityProjectId });
    }
    setActivitySaving(false);
    setShowActivityModal(false);
    fetchProjects();
  };

  const deleteActivity = async (id) => {
    await supabase.from('activities').delete().eq('id', id);
    setDeleteTarget(null);
    fetchProjects();
  };

  /* ── Training CRUD ── */
  const openNewTraining = (activityId, projectId) => {
    setTrainingForm(emptyTraining);
    setTrainingActivityId(activityId);
    setTrainingProjectId(projectId);
    setShowTrainingModal(true);
  };

  const saveTraining = async () => {
    if (!trainingForm.title.trim()) return;
    setTrainingSaving(true);
    await supabase.from('trainings').insert({
      ...trainingForm,
      activity_id: trainingActivityId,
    });
    setTrainingSaving(false);
    setShowTrainingModal(false);
    fetchProjects();
  };

  const deleteTraining = async (id) => {
    await supabase.from('trainings').delete().eq('id', id);
    setDeleteTarget(null);
    fetchProjects();
  };

  const isExpired = (qr_expires_at) => {
    if (!qr_expires_at) return true;
    return new Date(qr_expires_at) < new Date();
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /><span>{t('loading')}</span></div>;
  }

  return (
    <div className="page-container animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('projects')}</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>Manage projects, activities, and trainings</p>
        </div>
        <button className="btn btn-primary" onClick={openNewProject}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t('new_project')}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">📁</div>
          <h3>No projects yet</h3>
          <p>Create your first project to start managing trainings.</p>
          <button className="btn btn-primary" onClick={openNewProject} style={{ marginTop: 16 }}>
            {t('new_project')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {projects.map((project) => (
            <div key={project.id} className="card">
              {/* Project Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--primary-light)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </span>
                    {project.name}
                  </h2>
                  {project.description && <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>{project.description}</p>}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {project.activities?.length || 0} activities
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditProject(project)}>{t('edit')}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget({ type: 'project', id: project.id, name: project.name })}>{t('delete')}</button>
                  <button className="btn btn-primary btn-sm" onClick={() => openNewActivity(project.id)}>
                    + {t('add_activity')}
                  </button>
                </div>
              </div>

              {/* Activities */}
              {(project.activities || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                  No activities yet. Add one above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                  {(project.activities || []).map((activity) => (
                    <div key={activity.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--secondary)' }}>⬡</span>
                          {activity.name}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({activity.trainings?.length || 0} trainings)
                          </span>
                        </h3>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditActivity(activity, project.id)}>{t('edit')}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget({ type: 'activity', id: activity.id, name: activity.name })}>{t('delete')}</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openNewTraining(activity.id, project.id)}>
                            + {t('training')}
                          </button>
                        </div>
                      </div>

                      {/* Trainings */}
                      {(activity.trainings || []).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: 12 }}>No trainings yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                          {(activity.trainings || []).map((training) => (
                            <div key={training.id} style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px 16px',
                              position: 'relative',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{training.title}</div>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                    <span className="badge badge-purple">{training.days_count}{t('days')}</span>
                                    {training.has_pre_test && <span className="badge badge-info">{t('pre_test')}</span>}
                                    {training.has_post_test && <span className="badge badge-info">{t('post_test')}</span>}
                                    {training.has_evaluation && <span className="badge badge-success">{t('eval')}</span>}
                                  </div>
                                  <span className={`badge ${isExpired(training.qr_expires_at) ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                                    QR {isExpired(training.qr_expires_at) ? t('expired') : t('active')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                  <Link to={`/admin/trainings/${training.id}`} className="btn btn-primary btn-sm">
                                    {t('manage')}
                                  </Link>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => setDeleteTarget({ type: 'training', id: training.id, name: training.title })}
                                  >
                                    {t('delete')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Project Modal ── */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProject ? t('edit') : t('new_project')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowProjectModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>{t('project_name')} *</label>
                <input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="e.g. KU50"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowProjectModal(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveProject} disabled={projectSaving || !projectForm.name.trim()}>
                {projectSaving ? <><span className="spinner spinner-sm" /> {t('save')}...</> : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Modal ── */}
      {showActivityModal && (
        <div className="modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingActivity ? t('edit') : t('add_activity')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowActivityModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label>{t('activity_name')} *</label>
              <input
                value={activityForm.name}
                onChange={(e) => setActivityForm({ name: e.target.value })}
                placeholder="e.g. Life Skills Trainings and Football Activities"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowActivityModal(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveActivity} disabled={activitySaving || !activityForm.name.trim()}>
                {activitySaving ? <><span className="spinner spinner-sm" /> {t('save')}...</> : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Training Modal ── */}
      {showTrainingModal && (
        <div className="modal-overlay" onClick={() => setShowTrainingModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('new_training')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowTrainingModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>{t('training_title')} *</label>
                <input
                  value={trainingForm.title}
                  onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                  placeholder="e.g. Life Skills Training - Batch 1"
                />
              </div>
              <div className="form-group">
                <label>{t('number_of_days')}</label>
                <select
                  value={trainingForm.days_count}
                  onChange={(e) => setTrainingForm({ ...trainingForm, days_count: parseInt(e.target.value) })}
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Enable Features</p>
                {[
                  { key: 'has_pre_test', label: 'Pre-Test' },
                  { key: 'has_post_test', label: 'Post-Test' },
                  { key: 'has_evaluation', label: 'Evaluation Form' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={trainingForm[key]}
                      onChange={(e) => setTrainingForm({ ...trainingForm, [key]: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowTrainingModal(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveTraining} disabled={trainingSaving || !trainingForm.title.trim()}>
                {trainingSaving ? <><span className="spinner spinner-sm" /> {t('save')}...</> : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>⚠ {t('delete_confirm')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('delete_warning')} <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>
            </p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>{t('cancel')}</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (deleteTarget.type === 'project') deleteProject(deleteTarget.id);
                  if (deleteTarget.type === 'activity') deleteActivity(deleteTarget.id);
                  if (deleteTarget.type === 'training') deleteTraining(deleteTarget.id);
                }}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
