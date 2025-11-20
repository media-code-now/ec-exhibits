import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';
import { NotificationBell } from './NotificationBell.jsx';
import { ProgressStages } from './ProgressStages.jsx';
import { ProjectChat } from './ProjectChat.jsx';
import { InvoicesCard } from './InvoicesCard.jsx';
import { FilesCard } from './FilesCard.jsx';
import { ProjectFilesCard } from './ProjectFilesCard.jsx';
import { FileDropzone } from './FileDropzone.jsx';
import logoMark from '../assets/exhibit-control-logo.svg';
import { TemplateAdminPanel } from './TemplateAdminPanel.jsx';
import { SavedTemplatesList } from './SavedTemplatesList.jsx';
import { ChecklistPanel } from './ChecklistPanel.jsx';

const generateRandomPassword = (length = 14) => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%&*?';
  const max = charset.length;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return Array.from(values, value => charset[value % max]).join('');
  }
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += charset.charAt(Math.floor(Math.random() * max));
  }
  return result;
};

const copyTextToClipboard = async text => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  if (typeof document === 'undefined') {
    return false;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch (error) {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
};

export function Dashboard({
  user,
  project,
  projects,
  token,
  onProjectChange,
  onProjectCreated,
  onProjectUpdated,
  activeSection = 'dashboard',
  onSectionChange,
  onLogout
}) {
  const queryClient = useQueryClient();
  const isOwner = user.role === 'owner';
  const isStaff = user.role === 'staff';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: stageResponse } = useQuery({
    queryKey: ['stages', project.id],
    queryFn: async () => {
      const { data } = await axios.get(`/projects/${project.id}/stages`);
      return data;
    },
    enabled: Boolean(project?.id)
  });

  const { data: invoiceResponse } = useQuery({
    queryKey: ['invoices', project.id],
    queryFn: async () => {
      const { data } = await axios.get(`/projects/${project.id}/invoices`);
      return data;
    },
    enabled: Boolean(project?.id)
  });

  const stageMutation = useMutation({
    mutationFn: ({ stageId, status }) =>
      axios.patch(`/projects/${project.id}/stages/${stageId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['stages', project.id]);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ stageId, payload }) =>
      axios.post(`/projects/${project.id}/stages/${stageId}/tasks`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['stages', project.id]);
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ stageId, taskId, state }) =>
      axios.patch(`/projects/${project.id}/stages/${stageId}/tasks/${taskId}`, { state }),
    onSuccess: () => {
      queryClient.invalidateQueries(['stages', project.id]);
    }
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: ({ invoiceId, paymentConfirmed }) =>
      axios
        .patch(`/projects/${project.id}/invoices/${invoiceId}`, { paymentConfirmed })
        .then(({ data }) => data.invoice),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices', project.id]);
    }
  });

  const { data: userDirectory } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/users');
      return data;
    },
    enabled: isOwner
  });

  const [createForm, setCreateForm] = useState({
    name: '',
    show: '',
    size: '',
    moveInDate: '',
    openingDay: '',
    description: '',
    clientIds: [],
    staffIds: []
  });
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [generatedPasswords, setGeneratedPasswords] = useState({});
  const [passwordNotices, setPasswordNotices] = useState({});
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('client');
  const [createUserForm, setCreateUserForm] = useState({
    displayName: '',
    email: '',
    role: 'client'
  });

  const createProjectMutation = useMutation({
    mutationFn: payload => axios.post('/projects', payload).then(({ data }) => data.project),
    onSuccess: newProject => {
      onProjectCreated?.(newProject);
      setCreateForm({ name: '', show: '', size: '', moveInDate: '', openingDay: '', description: '', clientIds: [], staffIds: [] });
      setShowCreateProject(false);
      onProjectChange?.(newProject.id);
      queryClient.invalidateQueries(['stages', newProject.id]);
    }
  });

  const inviteMutation = useMutation({
    mutationFn: ({ userId, role }) =>
      axios.post(`/projects/${project.id}/invite`, { userId, role }).then(({ data }) => data.project),
    onSuccess: updatedProject => {
      onProjectUpdated?.(updatedProject);
      setInviteUserId('');
    }
  });

  const createUserMutation = useMutation({
    mutationFn: payload => axios.post('/users', payload).then(({ data }) => data.user),
    onSuccess: () => {
      setCreateUserForm({ displayName: '', email: '', role: 'client' });
      queryClient.invalidateQueries(['users']);
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: userId =>
      axios.delete(`/projects/${project.id}/members/${userId}`).then(({ data }) => data.project),
    onSuccess: updatedProject => {
      onProjectUpdated?.(updatedProject);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: userId => axios.delete(`/users/${userId}`).then(({ data }) => data),
    onSuccess: ({ projects: updatedProjects = [] } = {}) => {
      queryClient.invalidateQueries(['users']);
      updatedProjects.forEach(updatedProject => {
        onProjectUpdated?.(updatedProject);
      });
    }
  });

  const invoices = invoiceResponse?.invoices ?? [];
  const stages = stageResponse?.stages ?? [];
  const statuses = stageResponse?.statuses ?? ['not_started', 'in_progress', 'completed'];
  const taskStatuses = stageResponse?.taskStatuses ?? ['not_started', 'in_progress', 'blocked', 'completed'];
  const progressSummary = stageResponse?.progress;
  const canManageChecklist = isOwner || isStaff;

  const directory = userDirectory?.users ?? [];
  const clients = useMemo(
    () => directory.filter(candidate => candidate.role === 'client'),
    [directory]
  );
  const staff = useMemo(
    () => directory.filter(candidate => candidate.role === 'staff'),
    [directory]
  );

  const memberIds = useMemo(() => new Set(project.members.map(member => member.userId)), [project]);
  const invitableClients = useMemo(
    () => clients.filter(candidate => !memberIds.has(candidate.id)),
    [clients, memberIds]
  );
  const invitableStaff = useMemo(
    () => staff.filter(candidate => !memberIds.has(candidate.id)),
    [staff, memberIds]
  );

  const handleCreateSubmit = event => {
    event.preventDefault();
    if (!createForm.name) return;
    createProjectMutation.mutate({
      name: createForm.name,
      show: createForm.show,
      size: createForm.size,
      moveInDate: createForm.moveInDate,
      openingDay: createForm.openingDay,
      description: createForm.description,
      clientIds: createForm.clientIds,
      staffIds: createForm.staffIds
    });
  };

  const handleInviteSubmit = event => {
    event.preventDefault();
    if (!inviteUserId) return;
    inviteMutation.mutate({ userId: inviteUserId, role: inviteRole });
  };

  const toggleSelection = (field, value) => {
    setCreateForm(previous => {
      const selected = new Set(previous[field]);
      if (selected.has(value)) {
        selected.delete(value);
      } else {
        selected.add(value);
      }
      return { ...previous, [field]: [...selected] };
    });
  };

  const handleInviteRoleChange = role => {
    setInviteRole(role);
    setInviteUserId('');
  };

  const handleCreateUserSubmit = event => {
    event.preventDefault();
    if (!createUserForm.displayName.trim() || !createUserForm.email.trim()) return;
    createUserMutation.mutate({
      displayName: createUserForm.displayName,
      email: createUserForm.email,
      role: createUserForm.role
    });
  };

  const handleAssignToProject = user => {
    if (memberIds.has(user.id)) return;
    inviteMutation.mutate({ userId: user.id, role: user.role });
  };

  const handleRemoveFromProject = user => {
    if (!memberIds.has(user.id) || removeMemberMutation.isPending) return;
    removeMemberMutation.mutate(user.id);
  };

  const handleDeleteUser = directoryUser => {
    if (directoryUser.role === 'owner' || deleteUserMutation.isPending) return;
    const confirmed = window.confirm(
      `Delete ${directoryUser.displayName} from the portal? They will be removed from all projects.`
    );
    if (!confirmed) return;
    deleteUserMutation.mutate(directoryUser.id);
  };

  const inviteOptions = inviteRole === 'client' ? invitableClients : invitableStaff;
  const inviteDisabled = inviteMutation.isPending || inviteOptions.length === 0;
  const inviteLabel = inviteRole === 'staff' ? 'staff member' : 'client';
  const canManageInvoices = user.role !== 'client';

  const handleInvoiceToggle = invoice => {
    if (updateInvoiceStatusMutation.isPending) return;
    updateInvoiceStatusMutation.mutate({
      invoiceId: invoice.id,
      paymentConfirmed: !invoice.paymentConfirmed
    });
  };

  const handleSectionSelect = key => {
    onSectionChange?.(key);
    setIsMobileMenuOpen(false);
  };

  const navItems = useMemo(() => {
    const items = [{ key: 'dashboard', label: 'Dashboard' }];
    if (isOwner) {
      items.push({ key: 'projects', label: 'Projects' });
    }
    items.push({ key: 'files', label: 'Project Files' });
    if (isOwner || isStaff) {
      items.push({ key: 'checklist', label: 'Checklist' });
    }
    if (isOwner) {
      items.push({ key: 'template', label: 'Template' });
      items.push({ key: 'users', label: 'Users' });
    }
    return items;
  }, [isOwner, isStaff]);

  const allowedSections = useMemo(() => {
    const set = new Set(['dashboard', 'files']);
    if (isOwner || isStaff) {
      set.add('checklist');
    }
    if (isOwner) {
      set.add('projects');
      set.add('template');
      set.add('users');
    }
    return set;
  }, [isOwner, isStaff]);

  useEffect(() => {
    if (!allowedSections.has(activeSection)) {
      onSectionChange?.('dashboard');
    }
  }, [allowedSections, activeSection, onSectionChange]);

  const effectiveSection = allowedSections.has(activeSection) ? activeSection : 'dashboard';

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [effectiveSection]);

  useEffect(() => {
    if (effectiveSection !== 'projects') {
      setShowCreateProject(false);
    }
    if (effectiveSection !== 'users') {
      setGeneratedPasswords({});
      setPasswordNotices({});
    }
  }, [effectiveSection]);

  const schedulePasswordNoticeClear = userId => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      setPasswordNotices(previous => {
        if (!previous[userId]) return previous;
        const { [userId]: _removed, ...rest } = previous;
        return rest;
      });
    }, 4000);
  };

  const handleGeneratePassword = async userId => {
    const password = generateRandomPassword();
    setGeneratedPasswords(previous => ({ ...previous, [userId]: password }));
    let status = 'generated';
    try {
      const copied = await copyTextToClipboard(password);
      if (copied) {
        status = 'copied';
      }
    } catch (error) {
      status = 'generated';
    }
    setPasswordNotices(previous => ({ ...previous, [userId]: status }));
    schedulePasswordNoticeClear(userId);
  };

  const handleCopyPassword = async userId => {
    const password = generatedPasswords[userId];
    if (!password) return;
    let status = 'generated';
    try {
      const copied = await copyTextToClipboard(password);
      if (copied) {
        status = 'copied';
      }
    } catch (error) {
      status = 'generated';
    }
    setPasswordNotices(previous => ({ ...previous, [userId]: status }));
    schedulePasswordNoticeClear(userId);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:grid lg:grid-cols-[280px,1fr] lg:gap-8">
        <aside className="hidden rounded-3xl bg-slate-900 px-6 py-8 text-slate-200 lg:flex lg:flex-col">
          <div className="mb-10 space-y-2">
            <img src={logoMark} alt="Exhibit Control" className="h-14 w-auto" />
            <p className="text-sm uppercase tracking-widest text-slate-500">Client Portal</p>
          </div>
          <nav className="space-y-2 text-sm">
            {navItems.map(item => {
              const isActive = effectiveSection === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSectionSelect(item.key)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-xl px-4 py-3 transition',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="text-xs uppercase text-indigo-200">Active</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl bg-white/5 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">Need help?</p>
            <p>Chat with your EC team or email support@ec-exhibits.com</p>
          </div>
        </aside>

        <main className="flex flex-col gap-8">
          <div className="lg:hidden">
            <div className="sticky top-6 z-30 flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-slate-200 shadow-lg shadow-slate-900/20">
              <div className="flex items-center gap-3">
                <img src={logoMark} alt="Exhibit Control" className="h-10 w-auto" />
                <div>
                  <p className="text-sm font-semibold text-white">Client Portal</p>
                  <p className="text-xs text-slate-400">Navigate sections</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(open => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
                aria-expanded={isMobileMenuOpen}
              >
                <span>{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
                <span aria-hidden="true">
                  {isMobileMenuOpen ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18l12-12" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 px-4 pt-24"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div
                  className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-slate-200 shadow-2xl shadow-slate-900/50"
                  onClick={event => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">Quick Access</p>
                      <p className="text-lg font-semibold text-white">Choose a section</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>
                  <nav className="mt-6 space-y-2 text-sm">
                    {navItems.map(item => {
                      const isActive = effectiveSection === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleSectionSelect(item.key)}
                          className={clsx(
                            'flex w-full items-center justify-between rounded-xl px-4 py-3 transition',
                            isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          {item.label}
                          {isActive && (
                            <span className="text-xs uppercase text-indigo-200">Active</span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>
            )}
          </div>

          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <h2 className="text-2xl font-semibold text-slate-900">{user.name || user.displayName || user.email}</h2>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell token={token} projects={projects} />
              <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">
                  {(user.name || user.displayName || user.email || 'U').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user.name || user.displayName || user.email}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{user.role}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4 shadow-sm border border-slate-200">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Active Project</p>
              <p className="text-lg font-semibold text-slate-900">{project.name}</p>
            </div>
            <select
              value={project.id}
              onChange={event => onProjectChange(event.target.value)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              {projects.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {effectiveSection === 'dashboard' && (
            <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-8">
                <ProgressStages
                  stages={stages}
                  statuses={statuses}
                  taskStatuses={taskStatuses}
                  progressSummary={progressSummary}
                  canEdit={false}
                />
                <ProjectChat projectId={project.id} token={token} currentUser={user} />
              </div>
              <div className="space-y-8">
                <InvoicesCard
                  invoices={invoices}
                  canEdit={canManageInvoices}
                  onTogglePayment={handleInvoiceToggle}
                  isUpdating={updateInvoiceStatusMutation.isPending}
                />
                <FilesCard projectId={project.id} />
                {(isOwner || isStaff) && (
                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900">Upload Display Active Rendering</h3>
                    <p className="mb-4 text-sm text-slate-500">Attach deliverables with Yes/No review flags.</p>
                    <FileDropzone projectId={project.id} isActiveRenderingUpload={true} />
                  </div>
                )}
              </div>
            </section>
          )}

          {effectiveSection === 'files' && (
            <section className="space-y-8">
              <ProjectFilesCard projectId={project.id} canUpload={isOwner || isStaff} />
            </section>
          )}

          {effectiveSection === 'checklist' && (
            <ChecklistPanel projectId={project.id} stages={stages} canEdit={canManageChecklist} />
          )}

          {effectiveSection === 'template' && isOwner && (
            <div className="space-y-6">
              <SavedTemplatesList projectId={project.id} />
              <TemplateAdminPanel canEdit={isOwner} />
            </div>
          )}

          {effectiveSection === 'projects' && isOwner && (
            <>
              <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 lg:grid-cols-2">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Create a New Project</h3>
                      <p className="text-sm text-slate-500">Add project details and pre-select collaborators.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreateProject(previous => !previous)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                    >
                      {showCreateProject ? 'Hide form' : 'New project'}
                    </button>
                  </div>
                  {showCreateProject ? (
                    <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                      <label className="flex flex-col gap-2 text-sm text-slate-700">
                        Project name
                        <input
                          value={createForm.name}
                          onChange={event => setCreateForm(prev => ({ ...prev, name: event.target.value }))}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          placeholder="e.g. Winter Expo Build"
                          required
                        />
                      </label>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm text-slate-700">
                          Show
                          <input
                            value={createForm.show}
                            onChange={event => setCreateForm(prev => ({ ...prev, show: event.target.value }))}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder="e.g. CES 2025"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-slate-700">
                          Size
                          <input
                            value={createForm.size}
                            onChange={event => setCreateForm(prev => ({ ...prev, size: event.target.value }))}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder="e.g. 20x20 ft"
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm text-slate-700">
                          Move-in Date
                          <input
                            type="date"
                            value={createForm.moveInDate}
                            onChange={event => setCreateForm(prev => ({ ...prev, moveInDate: event.target.value }))}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-slate-700">
                          Opening Day
                          <input
                            type="date"
                            value={createForm.openingDay}
                            onChange={event => setCreateForm(prev => ({ ...prev, openingDay: event.target.value }))}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </label>
                      </div>

                      <label className="flex flex-col gap-2 text-sm text-slate-700">
                        Description
                        <textarea
                          value={createForm.description}
                          onChange={event => setCreateForm(prev => ({ ...prev, description: event.target.value }))}
                          className="min-h-[80px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                          placeholder="Short summary for your team"
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Invite clients now</p>
                          <div className="mt-2 grid gap-2">
                            {clients.length === 0 && (
                              <p className="text-xs text-slate-500">No clients available to invite.</p>
                            )}
                      {clients.map(client => (
                            <label key={client.id} className="flex items-center gap-3 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={createForm.clientIds.includes(client.id)}
                                onChange={() => toggleSelection('clientIds', client.id)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              {client.displayName}
                            </label>
                          ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">Invite staff now</p>
                          <div className="mt-2 grid gap-2">
                            {staff.length === 0 && (
                              <p className="text-xs text-slate-500">No staff available to invite.</p>
                            )}
                            {staff.map(member => (
                              <label key={member.id} className="flex items-center gap-3 text-sm text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={createForm.staffIds.includes(member.id)}
                                  onChange={() => toggleSelection('staffIds', member.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {member.displayName}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className={clsx(
                          'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
                          createProjectMutation.isPending ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-500'
                        )}
                        disabled={createProjectMutation.isPending}
                      >
                        {createProjectMutation.isPending ? 'Creating…' : 'Create project'}
                      </button>
                      {createProjectMutation.isError && (
                        <p className="text-xs text-rose-600">{createProjectMutation.error.response?.data?.error ?? 'Unable to create project'}</p>
                      )}
                    </form>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Press &ldquo;New project&rdquo; to open the creation form.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">Invite a Collaborator</h3>
                  <p className="text-sm text-slate-500">Send a project invite email with an access link.</p>
                  <form onSubmit={handleInviteSubmit} className="mt-4 space-y-4">
                    <div className="inline-flex rounded-full bg-slate-100 p-1">
                      {['client', 'staff'].map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleInviteRoleChange(option)}
                          className={clsx(
                            'px-3 py-1 text-sm font-semibold rounded-full transition',
                            inviteRole === option ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                          )}
                        >
                          {option === 'client' ? 'Client' : 'Staff'}
                        </button>
                      ))}
                    </div>
                    <label className="flex flex-col gap-2 text-sm text-slate-700">
                      Select {inviteLabel}
                      <select
                        value={inviteUserId}
                        onChange={event => setInviteUserId(event.target.value)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Choose a {inviteLabel}…</option>
                        {inviteOptions.map(person => (
                          <option key={person.id} value={person.id}>
                            {person.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className={clsx(
                        'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
                        inviteMutation.isPending ? 'bg-emerald-300' : 'bg-emerald-600 hover:bg-emerald-500'
                      )}
                      disabled={inviteDisabled}
                    >
                      {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
                    </button>
                    {inviteOptions.length === 0 && (
                      <p className="text-xs text-slate-500">All {inviteRole === 'staff' ? 'staff members' : 'clients'} are already on this project.</p>
                    )}
                    {inviteMutation.isError && (
                      <p className="text-xs text-rose-600">{inviteMutation.error.response?.data?.error ?? 'Invite failed'}</p>
                    )}
                  </form>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">Manage Project Stages & Tasks</h3>
                <p className="text-sm text-slate-500">Update stage status or add new tasks for <span className="font-semibold text-slate-700">{project.name}</span>.</p>
                <div className="mt-6">
                  <ProgressStages
                    stages={stages}
                    statuses={statuses}
                    taskStatuses={taskStatuses}
                    progressSummary={progressSummary}
                    canEdit={isOwner}
                    onStatusChange={(stageId, status) => stageMutation.mutate({ stageId, status })}
                    onTaskCreate={(stageId, draft) =>
                      createTaskMutation.mutate({
                        stageId,
                        payload: {
                          title: draft.title,
                          dueDate: draft.dueDate || null,
                          assignee: draft.assignee || null
                        }
                      })
                    }
                    onTaskStatusChange={(stageId, taskId, state) =>
                      updateTaskStatusMutation.mutate({ stageId, taskId, state })
                    }
                  />
                </div>
              </section>
            </>
          )}

          {effectiveSection === 'users' && isOwner && (
            <section className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">Add Directory User</h3>
                <p className="text-sm text-slate-500">Create a new client or staff member to assign later.</p>
                <form onSubmit={handleCreateUserSubmit} className="mt-4 space-y-4">
                  <label className="flex flex-col gap-2 text-sm text-slate-700">
                    Full name
                    <input
                      value={createUserForm.displayName}
                      onChange={event => setCreateUserForm(prev => ({ ...prev, displayName: event.target.value }))}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      placeholder="e.g. Jordan Rivera"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-700">
                    Email
                    <input
                      type="email"
                      value={createUserForm.email}
                      onChange={event => setCreateUserForm(prev => ({ ...prev, email: event.target.value }))}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      placeholder="person@example.com"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-700">
                    Role
                    <select
                      value={createUserForm.role}
                      onChange={event => setCreateUserForm(prev => ({ ...prev, role: event.target.value }))}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="client">Client</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className={clsx(
                      'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition',
                      createUserMutation.isPending ? 'bg-slate-300' : 'bg-slate-800 hover:bg-slate-700'
                    )}
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? 'Saving…' : 'Add user'}
                  </button>
                  {createUserMutation.isError && (
                    <p className="text-xs text-rose-600">{createUserMutation.error.response?.data?.error ?? 'Unable to add user'}</p>
                  )}
                </form>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">User Directory</h3>
                <p className="text-sm text-slate-500">Assign clients or staff to <span className="font-semibold text-slate-700">{project.name}</span>.</p>
                {(removeMemberMutation.isError || deleteUserMutation.isError) && (
                  <div className="mt-2 space-y-1 text-xs text-rose-600">
                    {removeMemberMutation.isError && (
                      <p>{removeMemberMutation.error?.response?.data?.error ?? 'Unable to remove member from project.'}</p>
                    )}
                    {deleteUserMutation.isError && (
                      <p>{deleteUserMutation.error?.response?.data?.error ?? 'Unable to delete user.'}</p>
                    )}
                  </div>
                )}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">Clients</h4>
                    <div className="space-y-2">
                      {clients.length === 0 && <p className="text-xs text-slate-400">No clients in directory yet.</p>}
                      {clients.map(client => {
                        const assigned = memberIds.has(client.id);
                        const generatedPassword = generatedPasswords[client.id];
                        const notice = passwordNotices[client.id];
                        return (
                          <div key={client.id} className="space-y-2 rounded-xl border border-slate-200 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{client.displayName}</p>
                                <p className="text-xs text-slate-500">{client.email}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGeneratePassword(client.id)}
                                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                  disabled={deleteUserMutation.isPending}
                                >
                                  Generate password
                                </button>
                                {assigned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromProject(client)}
                                    className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 hover:bg-rose-200"
                                    disabled={removeMemberMutation.isPending || deleteUserMutation.isPending}
                                  >
                                    {removeMemberMutation.isPending ? 'Removing…' : 'Remove'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAssignToProject(client)}
                                    className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-500"
                                    disabled={inviteMutation.isPending || deleteUserMutation.isPending}
                                  >
                                    {inviteMutation.isPending ? 'Assigning…' : 'Assign'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(client)}
                                  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50"
                                  disabled={deleteUserMutation.isPending || client.role === 'owner'}
                                >
                                  {deleteUserMutation.isPending ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                            {generatedPassword && (
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-900">
                                  {generatedPassword}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(client.id)}
                                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                >
                                  Copy
                                </button>
                                <span
                                  className={clsx(
                                    'text-[11px]',
                                    notice === 'copied' ? 'text-emerald-600' : 'text-slate-400'
                                  )}
                                >
                                  {notice === 'copied'
                                    ? 'Password copied to clipboard.'
                                    : 'Share this password securely.'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">Staff</h4>
                    <div className="space-y-2">
                      {staff.length === 0 && <p className="text-xs text-slate-400">No staff in directory yet.</p>}
                      {staff.map(member => {
                        const assigned = memberIds.has(member.id);
                        const generatedPassword = generatedPasswords[member.id];
                        const notice = passwordNotices[member.id];
                        return (
                          <div key={member.id} className="space-y-2 rounded-xl border border-slate-200 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{member.displayName}</p>
                                <p className="text-xs text-slate-500">{member.email}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleGeneratePassword(member.id)}
                                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                  disabled={deleteUserMutation.isPending}
                                >
                                  Generate password
                                </button>
                                {assigned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromProject(member)}
                                    className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700 hover:bg-rose-200"
                                    disabled={removeMemberMutation.isPending || deleteUserMutation.isPending}
                                  >
                                    {removeMemberMutation.isPending ? 'Removing…' : 'Remove'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAssignToProject(member)}
                                    className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-indigo-500"
                                    disabled={inviteMutation.isPending || deleteUserMutation.isPending}
                                  >
                                    {inviteMutation.isPending ? 'Assigning…' : 'Assign'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(member)}
                                  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50"
                                  disabled={deleteUserMutation.isPending || member.role === 'owner'}
                                >
                                  {deleteUserMutation.isPending ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                            {generatedPassword && (
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-900">
                                  {generatedPassword}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(member.id)}
                                  className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                                >
                                  Copy
                                </button>
                                <span
                                  className={clsx(
                                    'text-[11px]',
                                    notice === 'copied' ? 'text-emerald-600' : 'text-slate-400'
                                  )}
                                >
                                  {notice === 'copied'
                                    ? 'Password copied to clipboard.'
                                    : 'Share this password securely.'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
