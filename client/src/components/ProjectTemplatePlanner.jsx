import { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';

const projectTemplate = {
  templateId: 'std-ec-exhibit',
  name: 'Standard Exhibit Lifecycle',
  stages: [
    {
      stageName: 'Files & Paperwork',
      stageSlug: 'files_paperwork',
      stageOrder: 1,
      stageDescription: 'Collect client intake documents, agreements, and compliance paperwork.',
      defaultStageDueInDays: 5,
      tasks: [
        {
          taskName: 'Send client portal invite & welcome packet',
          taskSlug: 'send_portal_invite',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 0,
          requiresClientInput: false,
          requiredUploadIds: []
        },
        {
          taskName: 'Collect client project brief',
          taskSlug: 'collect_project_brief',
          defaultAssigneeRole: 'client',
          defaultDueInDays: 2,
          requiresClientInput: true,
          requiredUploadIds: ['client_project_brief']
        },
        {
          taskName: 'Upload signed exhibit agreement',
          taskSlug: 'execute_agreement',
          defaultAssigneeRole: 'client',
          defaultDueInDays: 3,
          requiresClientInput: true,
          requiredUploadIds: ['signed_contract']
        },
        {
          taskName: 'Collect insurance COI & show services forms',
          taskSlug: 'collect_insurance',
          defaultAssigneeRole: 'client',
          defaultDueInDays: 5,
          requiresClientInput: true,
          requiredUploadIds: ['insurance_coi', 'show_services_forms']
        }
      ],
      uploads: [
        {
          uploadId: 'client_project_brief',
          label: 'Client Project Brief',
          acceptedTypes: ['pdf', 'docx'],
          maxFiles: 1,
          required: true
        },
        {
          uploadId: 'signed_contract',
          label: 'Signed Exhibit Agreement',
          acceptedTypes: ['pdf'],
          maxFiles: 1,
          required: true
        },
        {
          uploadId: 'insurance_coi',
          label: 'Certificate of Insurance',
          acceptedTypes: ['pdf', 'jpg', 'png'],
          maxFiles: 2,
          required: true
        },
        {
          uploadId: 'show_services_forms',
          label: 'Show Services & Compliance Forms',
          acceptedTypes: ['pdf', 'zip'],
          maxFiles: 5,
          required: false
        },
        {
          uploadId: 'venue_floorplan',
          label: 'Venue Floorplan or Booth Map',
          acceptedTypes: ['pdf', 'jpg', 'png'],
          maxFiles: 1,
          required: false
        }
      ],
      yesNoToggles: [
        { toggleId: 'client_profile_complete', label: 'Client company profile complete', defaultValue: false },
        { toggleId: 'credit_application_received', label: 'Credit application received', defaultValue: false },
        { toggleId: 'insurance_approved', label: 'Insurance documents approved', defaultValue: false }
      ]
    },
    {
      stageName: 'Invoices & Payments',
      stageSlug: 'invoices_payments',
      stageOrder: 2,
      stageDescription: 'Issue estimates, track invoices, and confirm milestone payments.',
      defaultStageDueInDays: 10,
      tasks: [
        {
          taskName: 'Upload estimate & project budget',
          taskSlug: 'issue_estimate',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 0,
          requiresClientInput: false,
          requiredUploadIds: ['project_estimate']
        },
        {
          taskName: 'Send deposit invoice',
          taskSlug: 'send_deposit_invoice',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 1,
          requiresClientInput: false,
          requiredUploadIds: ['deposit_invoice']
        },
        {
          taskName: 'Confirm first payment received',
          taskSlug: 'record_deposit_payment',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 7,
          requiresClientInput: false,
          requiredUploadIds: ['payment_proof']
        },
        {
          taskName: 'Schedule progress payment reminders',
          taskSlug: 'schedule_future_payments',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 10,
          requiresClientInput: false,
          requiredUploadIds: []
        }
      ],
      uploads: [
        {
          uploadId: 'project_estimate',
          label: 'Project Estimate / Budget',
          acceptedTypes: ['pdf', 'xlsx'],
          maxFiles: 1,
          required: true
        },
        {
          uploadId: 'deposit_invoice',
          label: 'Deposit Invoice',
          acceptedTypes: ['pdf'],
          maxFiles: 1,
          required: true
        },
        {
          uploadId: 'progress_invoices',
          label: 'Progress / Final Invoices',
          acceptedTypes: ['pdf'],
          maxFiles: 5,
          required: false
        },
        {
          uploadId: 'payment_proof',
          label: 'Payment Confirmation',
          acceptedTypes: ['pdf', 'jpg', 'png'],
          maxFiles: 3,
          required: false
        }
      ],
      yesNoToggles: [
        { toggleId: 'deposit_paid', label: 'Client deposit received', defaultValue: false },
        { toggleId: 'second_invoice_sent', label: 'Second invoice sent', defaultValue: false },
        { toggleId: 'final_payment_cleared', label: 'Final payment cleared', defaultValue: false }
      ]
    },
    {
      stageName: 'Production Files',
      stageSlug: 'production_files',
      stageOrder: 3,
      stageDescription: 'Gather design assets, revisions, and final production-ready files.',
      defaultStageDueInDays: 20,
      tasks: [
        {
          taskName: 'Collect brand guidelines & assets',
          taskSlug: 'collect_brand_assets',
          defaultAssigneeRole: 'client',
          defaultDueInDays: 0,
          requiresClientInput: true,
          requiredUploadIds: ['brand_assets']
        },
        {
          taskName: 'Upload initial CAD/3D renderings',
          taskSlug: 'upload_initial_design',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 3,
          requiresClientInput: false,
          requiredUploadIds: ['initial_renders']
        },
        {
          taskName: 'Capture client feedback & revisions',
          taskSlug: 'capture_feedback',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 7,
          requiresClientInput: true,
          requiredUploadIds: ['feedback_rounds']
        },
        {
          taskName: 'Upload final production-ready files',
          taskSlug: 'finalize_production_files',
          defaultAssigneeRole: 'staff',
          defaultDueInDays: 12,
          requiresClientInput: false,
          requiredUploadIds: ['final_production_pack']
        }
      ],
      uploads: [
        {
          uploadId: 'brand_assets',
          label: 'Brand Assets & Guidelines',
          acceptedTypes: ['zip', 'pdf'],
          maxFiles: 2,
          required: true
        },
        {
          uploadId: 'initial_renders',
          label: 'Initial CAD / 3D Renderings',
          acceptedTypes: ['pdf', 'jpg', 'png', 'zip'],
          maxFiles: 3,
          required: true
        },
        {
          uploadId: 'feedback_rounds',
          label: 'Client Feedback & Markups',
          acceptedTypes: ['pdf', 'pptx'],
          maxFiles: 5,
          required: false
        },
        {
          uploadId: 'final_production_pack',
          label: 'Final Production Pack',
          acceptedTypes: ['zip', 'pdf'],
          maxFiles: 2,
          required: true
        }
      ],
      yesNoToggles: [
        { toggleId: 'artwork_approved', label: 'Artwork approved by client', defaultValue: false },
        { toggleId: 'color_proofs_signed', label: 'Color proofs signed off', defaultValue: false },
        { toggleId: 'cnc_files_locked', label: 'CNC files locked for fabrication', defaultValue: false }
      ]
    }
  ]
};

const renderAcceptedTypes = types => types.map(type => type.toUpperCase()).join(', ');

function TogglePill({ value, onChange, label }) {
  const activeClasses = value ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200';
  const pillText = value ? 'Yes' : 'No';
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={clsx(
        'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
        activeClasses
      )}
      aria-pressed={value}
    >
      {label ? `${label}: ${pillText}` : pillText}
    </button>
  );
}

function UploadDropzone({ stageSlug, upload, files, onDropFiles, onRemoveFile }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: acceptedFiles => onDropFiles(stageSlug, upload.uploadId, acceptedFiles),
    multiple: upload.maxFiles !== 1
  });

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{upload.label}</p>
          <p className="text-xs text-slate-500">
            Accepted: {renderAcceptedTypes(upload.acceptedTypes)} · Max files: {upload.maxFiles}{' '}
            {upload.required ? '· Required' : '· Optional'}
          </p>
        </div>
      </header>
      <div
        {...getRootProps()}
        className={clsx(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-6 text-center transition-colors',
          isDragActive ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-indigo-400'
        )}
      >
        <input {...getInputProps()} />
        <p className="text-xs font-medium uppercase tracking-wide">Drag & drop or click to add</p>
      </div>
      {files?.length ? (
        <ul className="space-y-2">
          {files.map(file => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            >
              <span className="truncate">
                {file.file.name} · {(file.file.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile(stageSlug, upload.uploadId, file.id)}
                className="text-rose-600 hover:text-rose-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-slate-400">No files uploaded yet.</p>
      )}
    </section>
  );
}

export function ProjectTemplatePlanner({ template = projectTemplate }) {
  const sortedStages = useMemo(
    () => [...template.stages].sort((a, b) => a.stageOrder - b.stageOrder),
    [template.stages]
  );

  const [taskDueDates, setTaskDueDates] = useState(() => {
    const map = {};
    sortedStages.forEach(stage => {
      map[stage.stageSlug] = {};
      stage.tasks.forEach(task => {
        map[stage.stageSlug][task.taskSlug] = '';
      });
    });
    return map;
  });

  const [toggleStates, setToggleStates] = useState(() => {
    const map = {};
    sortedStages.forEach(stage => {
      map[stage.stageSlug] = {};
      stage.yesNoToggles.forEach(toggle => {
        map[stage.stageSlug][toggle.toggleId] = toggle.defaultValue ?? false;
      });
    });
    return map;
  });

  const [stageUploads, setStageUploads] = useState(() => {
    const map = {};
    sortedStages.forEach(stage => {
      map[stage.stageSlug] = {};
      stage.uploads.forEach(upload => {
        map[stage.stageSlug][upload.uploadId] = [];
      });
    });
    return map;
  });

  const handleDueDateChange = (stageSlug, taskSlug, value) => {
    setTaskDueDates(prev => ({
      ...prev,
      [stageSlug]: {
        ...prev[stageSlug],
        [taskSlug]: value
      }
    }));
  };

  const handleToggleChange = (stageSlug, toggleId, value) => {
    setToggleStates(prev => ({
      ...prev,
      [stageSlug]: {
        ...prev[stageSlug],
        [toggleId]: value
      }
    }));
  };

  const handleUploadDrop = (stageSlug, uploadId, files) => {
    const prepared = files.map(file => ({ id: crypto.randomUUID(), file }));
    setStageUploads(prev => ({
      ...prev,
      [stageSlug]: {
        ...prev[stageSlug],
        [uploadId]: [...prev[stageSlug][uploadId], ...prepared]
      }
    }));
  };

  const handleRemoveFile = (stageSlug, uploadId, fileId) => {
    setStageUploads(prev => ({
      ...prev,
      [stageSlug]: {
        ...prev[stageSlug],
        [uploadId]: prev[stageSlug][uploadId].filter(file => file.id !== fileId)
      }
    }));
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{template.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review and seed the default stages, tasks, due dates, required uploads, and completion toggles before creating a
          project.
        </p>
      </header>

      {sortedStages.map(stage => (
        <section key={stage.stageSlug} className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Stage {stage.stageOrder}</p>
              <h2 className="text-xl font-semibold text-slate-900">{stage.stageName}</h2>
              <p className="text-sm text-slate-600">{stage.stageDescription}</p>
            </div>
            <div className="rounded-xl bg-white px-4 py-3 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Default Due Offset</p>
              <p className="text-sm font-medium text-slate-700">{stage.defaultStageDueInDays} days from project start</p>
            </div>
          </header>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tasks</h3>
            <ul className="space-y-4">
              {stage.tasks.map(task => (
                <li
                  key={task.taskSlug}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex md:items-center md:justify-between md:gap-6"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{task.taskName}</p>
                    <p className="text-xs text-slate-500">
                      Owner: {task.defaultAssigneeRole} · Default due in {task.defaultDueInDays} days{' '}
                      {task.requiresClientInput ? '· Requires client input' : ''}
                    </p>
                    {task.requiredUploadIds.length ? (
                      <p className="text-xs text-slate-400">
                        Requires uploads:&nbsp;
                        {task.requiredUploadIds.join(', ')}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">No uploads required</p>
                    )}
                  </div>
                  <label className="mt-3 flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500 md:mt-0">
                    Due Date
                    <input
                      type="date"
                      value={taskDueDates[stage.stageSlug][task.taskSlug]}
                      onChange={event => handleDueDateChange(stage.stageSlug, task.taskSlug, event.target.value)}
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Uploads</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {stage.uploads.map(upload => (
                <UploadDropzone
                  key={upload.uploadId}
                  stageSlug={stage.stageSlug}
                  upload={upload}
                  files={stageUploads[stage.stageSlug][upload.uploadId]}
                  onDropFiles={handleUploadDrop}
                  onRemoveFile={handleRemoveFile}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Completion Toggles</h3>
            <div className="flex flex-wrap gap-3">
              {stage.yesNoToggles.map(toggle => (
                <TogglePill
                  key={toggle.toggleId}
                  value={toggleStates[stage.stageSlug][toggle.toggleId]}
                  onChange={value => handleToggleChange(stage.stageSlug, toggle.toggleId, value)}
                  label={toggle.label}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default ProjectTemplatePlanner;
