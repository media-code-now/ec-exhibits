import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import clsx from 'clsx';
import { NotificationBell } from './NotificationBell.jsx';
import { ProgressStages } from './ProgressStages.jsx';
import { ProjectChat } from './ProjectChat.jsx';
import { InvoicesCard } from './InvoicesCard.jsx';
import { FilesCard } from './FilesCard.jsx';
import { FileDropzone } from './FileDropzone.jsx';
import logoMark from '../assets/exhibit-control-logo.svg';

const invoiceSeed = {
  'proj-1': [
    { id: 'inv-101', number: 'INV-101', dueDate: 'May 15', amount: '12,500', currency: 'USD', stage: 'Design', paymentConfirmed: false },
    { id: 'inv-100', number: 'INV-100', dueDate: 'Apr 10', amount: '5,000', currency: 'USD', stage: 'Discovery', paymentConfirmed: true }
  ],
  'proj-2': [{ id: 'inv-201', number: 'INV-201', dueDate: 'Jun 01', amount: '3,200', currency: 'USD', stage: 'Planning', paymentConfirmed: false }]
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
  onSectionChange
}) {
  const queryClient = useQueryClient();
  const isOwner = user.role === 'owner';

  const { data: stageResponse } = useQuery({
    queryKey: ['stages', project.id],
    queryFn: async () => {
      const { data } = await axios.get(`/projects/${project.id}/stages`);
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
    description: '',
    clientIds: [],
    staffIds: []
  });
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
      setCreateForm({ name: '', description: '', clientIds: [], staffIds: [] });
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

  const invoices = useMemo(() => invoiceSeed[project?.id] ?? [], [project?.id]);
  const stages = stageResponse?.stages ?? [];
  const statuses = stageResponse?.statuses ?? ['not_started', 'in_progress', 'completed'];
  const taskStatuses = stageResponse?.taskStatuses ?? ['not_started', 'in_progress', 'blocked', 'completed'];

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

  const navItems = useMemo(() => {
    const items = [{ key: 'dashboard', label: 'Dashboard' }];
    if (isOwner) {
      items.push({ key: 'projects', label: 'Projects' });
      items.push({ key: 'users', label: 'Users' });
    }
    return items;
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner && activeSection !== 'dashboard') {
      onSectionChange?.('dashboard');
    }
  }, [isOwner, activeSection, onSectionChange]);

  const effectiveSection = isOwner ? activeSection : 'dashboard';

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
                  onClick={() => onSectionChange?.(item.key)}
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
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <h2 className="text-2xl font-semibold text-slate-900">{user.displayName}</h2>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell token={token} projects={projects} />
              <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-600">
                  {user.displayName.slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user.displayName}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{user.role}</p>
                </div>
              </div>
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
                  canEdit={false}
                />
                <ProjectChat projectId={project.id} token={token} currentUser={user} />
              </div>
              <div className="space-y-8">
                <InvoicesCard invoices={invoices} />
                <FilesCard projectId={project.id} />
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900">Upload Invoice or Project Files</h3>
                  <p className="mb-4 text-sm text-slate-500">Attach deliverables with Yes/No review flags.</p>
                  <FileDropzone projectId={project.id} />
                </div>
              </div>
            </section>
          )}

          {effectiveSection === 'projects' && isOwner && (
            <>
              <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 lg:grid-cols-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Create a New Project</h3>
                  <p className="text-sm text-slate-500">Add project details and pre-select collaborators.</p>
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
                        return (
                          <div
                            key={client.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{client.displayName}</p>
                              <p className="text-xs text-slate-500">{client.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
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
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{member.displayName}</p>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
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
