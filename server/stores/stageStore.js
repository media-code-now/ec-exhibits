import { randomUUID } from 'crypto';

const defaultTemplateStages = [
  {
    slug: 'files-paperwork',
    name: 'Files & Paperwork',
    description: 'Collect client intake documents, compliance forms, and approvals.',
    defaultStageDueInDays: 5,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'send_portal_invite',
        title: 'Send client portal invite & welcome packet',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: []
      },
      {
        slug: 'collect_project_brief',
        title: 'Collect client project brief',
        ownerRole: 'client',
        defaultDueInDays: 2,
        requiresClientInput: true,
        requiredUploadIds: ['client_project_brief']
      },
      {
        slug: 'execute_agreement',
        title: 'Upload signed exhibit agreement',
        ownerRole: 'client',
        defaultDueInDays: 3,
        requiresClientInput: true,
        requiredUploadIds: ['signed_contract']
      },
      {
        slug: 'collect_insurance',
        title: 'Collect insurance COI & show services forms',
        ownerRole: 'client',
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
    toggles: [
      { toggleId: 'client_profile_complete', label: 'Client company profile complete', defaultValue: false },
      { toggleId: 'credit_application_received', label: 'Credit application received', defaultValue: false },
      { toggleId: 'insurance_approved', label: 'Insurance documents approved', defaultValue: false }
    ]
  },
  {
    slug: 'invoices-payments',
    name: 'Invoices & Payments',
    description: 'Issue estimates, track invoices, and confirm milestone payments.',
    defaultStageDueInDays: 10,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: false
    },
    tasks: [
      {
        slug: 'issue_estimate',
        title: 'Upload estimate & project budget',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: ['project_estimate']
      },
      {
        slug: 'send_deposit_invoice',
        title: 'Send deposit invoice',
        ownerRole: 'staff',
        defaultDueInDays: 1,
        requiresClientInput: false,
        requiredUploadIds: ['deposit_invoice']
      },
      {
        slug: 'record_deposit_payment',
        title: 'Confirm first payment received',
        ownerRole: 'staff',
        defaultDueInDays: 7,
        requiresClientInput: false,
        requiredUploadIds: ['payment_proof']
      },
      {
        slug: 'schedule_future_payments',
        title: 'Schedule progress payment reminders',
        ownerRole: 'staff',
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
    toggles: [
      { toggleId: 'deposit_paid', label: 'Client deposit received', defaultValue: false },
      { toggleId: 'second_invoice_sent', label: 'Second invoice sent', defaultValue: false },
      { toggleId: 'final_payment_cleared', label: 'Final payment cleared', defaultValue: false }
    ]
  },
  {
    slug: 'production-files',
    name: 'Production Files',
    description: 'Gather design assets, revisions, and final production-ready files.',
    defaultStageDueInDays: 20,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'collect_brand_assets',
        title: 'Collect brand guidelines & assets',
        ownerRole: 'client',
        defaultDueInDays: 0,
        requiresClientInput: true,
        requiredUploadIds: ['brand_assets']
      },
      {
        slug: 'upload_initial_design',
        title: 'Upload initial CAD/3D renderings',
        ownerRole: 'staff',
        defaultDueInDays: 3,
        requiresClientInput: false,
        requiredUploadIds: ['initial_renders']
      },
      {
        slug: 'capture_feedback',
        title: 'Capture client feedback & revisions',
        ownerRole: 'staff',
        defaultDueInDays: 7,
        requiresClientInput: true,
        requiredUploadIds: ['feedback_rounds']
      },
      {
        slug: 'finalize_production_files',
        title: 'Upload final production-ready files',
        ownerRole: 'staff',
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
    toggles: [
      { toggleId: 'artwork_approved', label: 'Artwork approved by client', defaultValue: false },
      { toggleId: 'color_proofs_signed', label: 'Color proofs signed off', defaultValue: false },
      { toggleId: 'cnc_files_locked', label: 'CNC files locked for fabrication', defaultValue: false }
    ]
  },
  {
    slug: 'graphics-branding',
    name: 'Graphics & Branding',
    description: 'Finalize signage specifications, print proofs, and approvals.',
    defaultStageDueInDays: 25,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'confirm_graphic_specs',
        title: 'Confirm graphic specs & materials',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: ['graphic_specs']
      },
      {
        slug: 'send_print_proof',
        title: 'Send print proofs for approval',
        ownerRole: 'staff',
        defaultDueInDays: 3,
        requiresClientInput: true,
        requiredUploadIds: ['print_proofs']
      },
      {
        slug: 'approve_final_graphics',
        title: 'Receive final graphics approval',
        ownerRole: 'client',
        defaultDueInDays: 5,
        requiresClientInput: true,
        requiredUploadIds: ['graphics_approval_form']
      }
    ],
    uploads: [
      {
        uploadId: 'graphic_specs',
        label: 'Graphic Specification Sheet',
        acceptedTypes: ['pdf', 'xlsx'],
        maxFiles: 1,
        required: true
      },
      {
        uploadId: 'print_proofs',
        label: 'Print Proofs',
        acceptedTypes: ['pdf', 'jpg', 'png'],
        maxFiles: 5,
        required: true
      },
      {
        uploadId: 'graphics_approval_form',
        label: 'Graphics Approval Form',
        acceptedTypes: ['pdf', 'docx'],
        maxFiles: 1,
        required: true
      }
    ],
    toggles: [
      { toggleId: 'proofs_approved', label: 'Proofs approved for print', defaultValue: false },
      { toggleId: 'materials_confirmed', label: 'Materials & finishes confirmed', defaultValue: false }
    ]
  },
  {
    slug: 'furniture-equipment',
    name: 'Furniture & Equipment',
    description: 'Confirm rental orders, equipment sourcing, and delivery timelines.',
    defaultStageDueInDays: 30,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'confirm_inventory',
        title: 'Confirm furniture & equipment inventory',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: true,
        requiredUploadIds: ['inventory_list']
      },
      {
        slug: 'submit_rental_orders',
        title: 'Submit rental or purchase orders',
        ownerRole: 'staff',
        defaultDueInDays: 2,
        requiresClientInput: false,
        requiredUploadIds: ['rental_orders']
      },
      {
        slug: 'confirm_delivery_schedule',
        title: 'Confirm delivery & pickup schedule',
        ownerRole: 'staff',
        defaultDueInDays: 5,
        requiresClientInput: false,
        requiredUploadIds: ['delivery_schedule']
      }
    ],
    uploads: [
      {
        uploadId: 'inventory_list',
        label: 'Furniture & Equipment Inventory List',
        acceptedTypes: ['xlsx'],
        maxFiles: 2,
        required: true
      },
      {
        uploadId: 'rental_orders',
        label: 'Rental / Purchase Orders',
        acceptedTypes: ['pdf'],
        maxFiles: 5,
        required: false
      },
      {
        uploadId: 'delivery_schedule',
        label: 'Delivery & Pickup Schedule',
        acceptedTypes: ['pdf', 'xlsx'],
        maxFiles: 1,
        required: false
      }
    ],
    toggles: [
      { toggleId: 'orders_confirmed', label: 'Rental orders confirmed', defaultValue: false },
      { toggleId: 'condition_checked', label: 'Items condition verified', defaultValue: false }
    ]
  },
  {
    slug: 'pre-build',
    name: 'Pre-Build',
    description: 'Mock build, QA punch list, and client preview before shipment.',
    defaultStageDueInDays: 40,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'schedule_prebuild',
        title: 'Schedule pre-build & invite client',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: []
      },
      {
        slug: 'capture_prebuild_media',
        title: 'Capture photos/video of pre-build',
        ownerRole: 'staff',
        defaultDueInDays: 2,
        requiresClientInput: false,
        requiredUploadIds: ['prebuild_gallery']
      },
      {
        slug: 'log_punchlist',
        title: 'Log punch list items',
        ownerRole: 'staff',
        defaultDueInDays: 3,
        requiresClientInput: false,
        requiredUploadIds: ['punchlist_report']
      },
      {
        slug: 'obtain_client_signoff',
        title: 'Obtain client sign-off',
        ownerRole: 'client',
        defaultDueInDays: 5,
        requiresClientInput: true,
        requiredUploadIds: ['prebuild_signoff']
      }
    ],
    uploads: [
      {
        uploadId: 'prebuild_gallery',
        label: 'Pre-Build Photo / Video Gallery',
        acceptedTypes: ['jpg', 'png', 'mp4', 'zip'],
        maxFiles: 10,
        required: true
      },
      {
        uploadId: 'punchlist_report',
        label: 'Punch List Report',
        acceptedTypes: ['pdf', 'xlsx'],
        maxFiles: 3,
        required: false
      },
      {
        uploadId: 'prebuild_signoff',
        label: 'Client Pre-Build Sign-Off',
        acceptedTypes: ['pdf'],
        maxFiles: 1,
        required: true
      }
    ],
    toggles: [
      { toggleId: 'prebuild_complete', label: 'Pre-build complete', defaultValue: false },
      { toggleId: 'punchlist_closed', label: 'All punch list items resolved', defaultValue: false },
      { toggleId: 'client_prebuild_approval', label: 'Client pre-build approval received', defaultValue: false }
    ]
  },
  {
    slug: 'logistics-shipping',
    name: 'Logistics & Shipping',
    description: 'Arrange freight, documentation, and warehouse coordination.',
    defaultStageDueInDays: 50,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: false
    },
    tasks: [
      {
        slug: 'book_carrier',
        title: 'Book carrier / freight',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: ['carrier_confirmation']
      },
      {
        slug: 'prepare_shipping_docs',
        title: 'Prepare shipping documents',
        ownerRole: 'staff',
        defaultDueInDays: 2,
        requiresClientInput: false,
        requiredUploadIds: ['shipping_documents']
      },
      {
        slug: 'confirm_warehouse_dates',
        title: 'Confirm advance warehouse & targeted move-in',
        ownerRole: 'staff',
        defaultDueInDays: 3,
        requiresClientInput: false,
        requiredUploadIds: ['warehouse_confirmation']
      }
    ],
    uploads: [
      {
        uploadId: 'carrier_confirmation',
        label: 'Carrier Booking Confirmation',
        acceptedTypes: ['pdf', 'jpg'],
        maxFiles: 2,
        required: true
      },
      {
        uploadId: 'shipping_documents',
        label: 'Shipping Documents (BOL, labels, manifest)',
        acceptedTypes: ['pdf', 'zip'],
        maxFiles: 5,
        required: true
      },
      {
        uploadId: 'warehouse_confirmation',
        label: 'Advance Warehouse / Targeted Move-In Confirmation',
        acceptedTypes: ['pdf', 'jpg'],
        maxFiles: 1,
        required: false
      },
      {
        uploadId: 'tracking_info',
        label: 'Tracking Information',
        acceptedTypes: ['txt', 'pdf'],
        maxFiles: 3,
        required: false
      }
    ],
    toggles: [
      { toggleId: 'freight_insured', label: 'Freight insurance confirmed', defaultValue: false },
      { toggleId: 'arrival_window_confirmed', label: 'Arrival window confirmed', defaultValue: false }
    ]
  },
  {
    slug: 'onsite-install',
    name: 'Onsite Install',
    description: 'Coordinate install crew, document onsite build, and confirm punch list.',
    defaultStageDueInDays: 60,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'onsite_briefing',
        title: 'Share onsite install brief with crew',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: ['install_brief']
      },
      {
        slug: 'complete_install',
        title: 'Complete onsite install',
        ownerRole: 'staff',
        defaultDueInDays: 1,
        requiresClientInput: false,
        requiredUploadIds: []
      },
      {
        slug: 'client_walkthrough',
        title: 'Conduct client walkthrough & sign-off',
        ownerRole: 'client',
        defaultDueInDays: 2,
        requiresClientInput: true,
        requiredUploadIds: ['install_signoff']
      }
    ],
    uploads: [
      {
        uploadId: 'install_brief',
        label: 'Install Brief & Labor Plan',
        acceptedTypes: ['pdf'],
        maxFiles: 1,
        required: true
      },
      {
        uploadId: 'onsite_photos',
        label: 'Onsite Photos',
        acceptedTypes: ['jpg', 'png'],
        maxFiles: 10,
        required: false
      },
      {
        uploadId: 'install_signoff',
        label: 'Client Install Sign-Off',
        acceptedTypes: ['pdf', 'jpg'],
        maxFiles: 1,
        required: true
      }
    ],
    toggles: [
      { toggleId: 'install_complete', label: 'Install complete', defaultValue: false },
      { toggleId: 'onsite_punchlist_resolved', label: 'Onsite punch list resolved', defaultValue: false }
    ]
  },
  {
    slug: 'post-show-closeout',
    name: 'Post-Show & Closeout',
    description: 'Manage dismantle, feedback, asset return, and final billing.',
    defaultStageDueInDays: 75,
    permissions: {
      viewRoles: ['owner', 'staff', 'client'],
      taskUpdateRoles: ['owner', 'staff'],
      checklistEditRoles: ['owner', 'staff'],
      clientCanUpload: true
    },
    tasks: [
      {
        slug: 'schedule_dismantle',
        title: 'Schedule dismantle & return freight',
        ownerRole: 'staff',
        defaultDueInDays: 0,
        requiresClientInput: false,
        requiredUploadIds: ['dismantle_plan']
      },
      {
        slug: 'collect_feedback',
        title: 'Collect post-show feedback',
        ownerRole: 'client',
        defaultDueInDays: 3,
        requiresClientInput: true,
        requiredUploadIds: ['feedback_form']
      },
      {
        slug: 'archive_assets',
        title: 'Archive project files & photos',
        ownerRole: 'staff',
        defaultDueInDays: 5,
        requiresClientInput: false,
        requiredUploadIds: ['archive_manifest']
      },
      {
        slug: 'issue_final_invoice',
        title: 'Issue final invoice & close financials',
        ownerRole: 'staff',
        defaultDueInDays: 7,
        requiresClientInput: false,
        requiredUploadIds: ['final_invoice']
      }
    ],
    uploads: [
      {
        uploadId: 'dismantle_plan',
        label: 'Dismantle Plan & Labor',
        acceptedTypes: ['pdf'],
        maxFiles: 1,
        required: false
      },
      {
        uploadId: 'feedback_form',
        label: 'Client Feedback Form',
        acceptedTypes: ['pdf', 'docx'],
        maxFiles: 1,
        required: false
      },
      {
        uploadId: 'archive_manifest',
        label: 'Archive Manifest',
        acceptedTypes: ['zip', 'pdf'],
        maxFiles: 1,
        required: false
      },
      {
        uploadId: 'final_invoice',
        label: 'Final Invoice',
        acceptedTypes: ['pdf'],
        maxFiles: 1,
        required: true
      }
    ],
    toggles: [
      { toggleId: 'feedback_collected', label: 'Client feedback collected', defaultValue: false },
      { toggleId: 'final_payment_received', label: 'Final payment received', defaultValue: false },
      { toggleId: 'assets_archived', label: 'Assets archived & project closed', defaultValue: false }
    ]
  }
];

const cloneTemplateStageDefinition = stage => ({
  ...stage,
  permissions: { ...(stage.permissions ?? {}) },
  tasks: (stage.tasks ?? []).map(task => ({
    ...task,
    requiredUploadIds: [...(task.requiredUploadIds ?? [])]
  })),
  uploads: (stage.uploads ?? []).map(upload => ({
    ...upload,
    acceptedTypes: [...(upload.acceptedTypes ?? [])]
  })),
  toggles: (stage.toggles ?? []).map(toggle => ({ ...toggle }))
});

const buildTemplateFromStages = stages => stages.map(cloneTemplateStageDefinition);

let templateStages = buildTemplateFromStages(defaultTemplateStages);

const slugify = value => {
  const text = String(value ?? '').toLowerCase().trim();
  if (!text) return '';
  return text
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '');
};

const allowedStatuses = new Set(['not_started', 'in_progress', 'completed']);
const allowedTaskStatuses = new Set(['not_started', 'in_progress', 'blocked', 'completed']);

const stageData = new Map();

const ensureString = (value, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const ensureNonEmptyString = (value, fallback = '') => {
  const str = ensureString(value, '').trim();
  return str.length ? str : fallback;
};

const ensurePositiveInt = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.round(num));
};

const ensureRoleArray = (value, fallback) => {
  if (!Array.isArray(value)) return [...fallback];
  const cleaned = value.map(item => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned : [...fallback];
};

const ensureStringArray = value => {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

const sanitizeKey = (value, fallback) => {
  const slug = slugify(value);
  return slug || fallback;
};

const normalisePermissions = permissions => {
  const source = permissions ?? {};
  return {
    viewRoles: ensureRoleArray(source.viewRoles, ['owner', 'staff', 'client']),
    taskUpdateRoles: ensureRoleArray(source.taskUpdateRoles, ['owner', 'staff']),
    checklistEditRoles: ensureRoleArray(source.checklistEditRoles, ['owner', 'staff']),
    clientCanUpload: source.clientCanUpload ?? false
  };
};

const isTaskOverdue = task => {
  if (!task || !task.dueDate) return false;
  if (task.state === 'completed') return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
};

const cloneTaskDefinition = task => ({
  ...task,
  requiredUploadIds: [...(task.requiredUploadIds ?? [])],
  isOverdue: isTaskOverdue(task)
});

const cloneUploadDefinition = upload => ({
  ...upload,
  acceptedTypes: [...(upload.acceptedTypes ?? [])]
});

const cloneToggleDefinition = toggle => ({ ...toggle });

const clonePermissions = permissions => ({ ...(permissions ?? {}) });

const sanitiseTemplateStages = stagesInput => {
  if (!Array.isArray(stagesInput) || stagesInput.length === 0) {
    throw new Error('Template must include at least one stage');
  }
  const stageSlugSet = new Set();

  return stagesInput.map((stageInput, stageIndex) => {
    const fallbackStageSlug = `stage-${stageIndex + 1}`;
    const stageSlug = sanitizeKey(stageInput?.slug ?? stageInput?.stageSlug ?? stageInput?.stage_id ?? stageInput?.name, fallbackStageSlug);
    if (stageSlugSet.has(stageSlug)) {
      throw new Error(`Duplicate stage slug "${stageSlug}"`);
    }
    stageSlugSet.add(stageSlug);

    const permissions = normalisePermissions(stageInput?.permissions);

    const taskSlugSet = new Set();
    const tasks = Array.isArray(stageInput?.tasks)
      ? stageInput.tasks.map((taskInput, taskIndex) => {
          const fallbackTaskSlug = `${stageSlug}-task-${taskIndex + 1}`;
          const taskSlug = sanitizeKey(taskInput?.slug ?? taskInput?.taskSlug ?? taskInput?.task_id ?? taskInput?.title, fallbackTaskSlug);
          if (taskSlugSet.has(taskSlug)) {
            throw new Error(`Duplicate task slug "${taskSlug}" in stage "${stageSlug}"`);
          }
          taskSlugSet.add(taskSlug);
          return {
            slug: taskSlug,
            title: ensureNonEmptyString(taskInput?.title, `Task ${taskIndex + 1}`),
            ownerRole: ensureNonEmptyString(taskInput?.ownerRole, 'staff'),
            defaultDueInDays: ensurePositiveInt(taskInput?.defaultDueInDays, 0),
            requiresClientInput: taskInput?.requiresClientInput ?? false,
            requiredUploadIds: ensureStringArray(taskInput?.requiredUploadIds)
          };
        })
      : [];

    const uploadIdSet = new Set();
    const uploads = Array.isArray(stageInput?.uploads)
      ? stageInput.uploads.map((uploadInput, uploadIndex) => {
          const fallbackUploadId = `${stageSlug}-upload-${uploadIndex + 1}`;
          const uploadId = sanitizeKey(uploadInput?.uploadId ?? uploadInput?.id ?? uploadInput?.name, fallbackUploadId);
          if (uploadIdSet.has(uploadId)) {
            throw new Error(`Duplicate upload id "${uploadId}" in stage "${stageSlug}"`);
          }
          uploadIdSet.add(uploadId);
          return {
            uploadId,
            label: ensureNonEmptyString(uploadInput?.label, `Upload ${uploadIndex + 1}`),
            acceptedTypes: ensureStringArray(uploadInput?.acceptedTypes),
            maxFiles: Math.max(1, ensurePositiveInt(uploadInput?.maxFiles, 1)),
            required: uploadInput?.required ?? false
          };
        })
      : [];

    const toggleIdSet = new Set();
    const toggles = Array.isArray(stageInput?.toggles)
      ? stageInput.toggles.map((toggleInput, toggleIndex) => {
          const fallbackToggleId = `${stageSlug}-toggle-${toggleIndex + 1}`;
          const toggleId = sanitizeKey(toggleInput?.toggleId ?? toggleInput?.id ?? toggleInput?.label, fallbackToggleId);
          if (toggleIdSet.has(toggleId)) {
            throw new Error(`Duplicate toggle id "${toggleId}" in stage "${stageSlug}"`);
          }
          toggleIdSet.add(toggleId);
          return {
            toggleId,
            label: ensureNonEmptyString(toggleInput?.label, `Toggle ${toggleIndex + 1}`),
            defaultValue: toggleInput?.defaultValue ?? false
          };
        })
      : [];

    return {
      slug: stageSlug,
      name: ensureNonEmptyString(stageInput?.name, `Stage ${stageIndex + 1}`),
      description: ensureString(stageInput?.description, ''),
      defaultStageDueInDays: ensurePositiveInt(stageInput?.defaultStageDueInDays, 0),
      permissions,
      tasks,
      uploads,
      toggles
    };
  });
};

const computeStageMetrics = stage => {
  const totalTasks = stage.tasks.length;
  const completedTasks = stage.tasks.filter(task => task.state === 'completed').length;
  const inProgressTasks = stage.tasks.filter(task => task.state === 'in_progress').length;
  const blockedTasks = stage.tasks.filter(task => task.state === 'blocked').length;
  const overdueTasks = stage.tasks.filter(isTaskOverdue).length;
  const percentComplete =
    totalTasks === 0
      ? stage.status === 'completed'
        ? 100
        : stage.status === 'in_progress'
          ? 50
          : 0
      : Math.round((completedTasks / totalTasks) * 100);
  return {
    totalTasks,
    completedTasks,
    remainingTasks: Math.max(0, totalTasks - completedTasks),
    inProgressTasks,
    blockedTasks,
    overdueTasks,
    percentComplete
  };
};

const cloneStage = stage => {
  const metrics = computeStageMetrics(stage);
  return {
    ...stage,
    permissions: clonePermissions(stage.permissions),
    tasks: stage.tasks.map(cloneTaskDefinition),
    uploads: stage.uploads.map(cloneUploadDefinition),
    toggles: stage.toggles.map(cloneToggleDefinition),
    progress: metrics,
    progressPercent: metrics.percentComplete
  };
};

function buildStagesForProject(projectId) {
  return templateStages.map((template, index) => ({
    id: `${projectId}-stage-${template.slug}`,
    templateSlug: template.slug,
    name: template.name,
    description: template.description,
    status: index === 0 ? 'in_progress' : 'not_started',
    dueDate: null,
    defaultDueOffsetDays: template.defaultStageDueInDays,
    permissions: { ...template.permissions },
    tasks: template.tasks.map(task => ({
      id: `${projectId}-${template.slug}-${task.slug}`,
      templateSlug: task.slug,
      title: task.title,
      state: 'not_started',
      dueDate: null,
      assignee: '',
      ownerRole: task.ownerRole,
      requiresClientInput: task.requiresClientInput,
      requiredUploadIds: [...task.requiredUploadIds]
    })),
    uploads: template.uploads.map(upload => ({ ...upload })),
    toggles: template.toggles.map(toggle => ({
      id: `${projectId}-${template.slug}-${toggle.toggleId}`,
      templateToggleId: toggle.toggleId,
      label: toggle.label,
      value: toggle.defaultValue ?? false
    }))
  }));
}

const computeProjectProgress = stages => {
  if (!stages.length) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      percentComplete: 0,
      completedStages: 0,
      totalStages: 0
    };
  }
  const totals = stages.reduce(
    (acc, stage) => {
      const metrics = computeStageMetrics(stage);
      acc.totalTasks += metrics.totalTasks;
      acc.completedTasks += metrics.completedTasks;
      if (stage.status === 'completed') acc.completedStages += 1;
      return acc;
    },
    { totalTasks: 0, completedTasks: 0, completedStages: 0 }
  );
  const totalStages = stages.length;
  const percentFromTasks =
    totals.totalTasks > 0 ? Math.round((totals.completedTasks / totals.totalTasks) * 100) : null;
  const percentFromStages = Math.round((totals.completedStages / totalStages) * 100);
  return {
    totalTasks: totals.totalTasks,
    completedTasks: totals.completedTasks,
    totalStages,
    completedStages: totals.completedStages,
    percentComplete: percentFromTasks ?? percentFromStages
  };
};

const recalculateStageStatus = stage => {
  const metrics = computeStageMetrics(stage);
  if (metrics.totalTasks === 0) return;
  if (metrics.completedTasks === metrics.totalTasks) {
    stage.status = 'completed';
  } else if (metrics.completedTasks > 0 || metrics.inProgressTasks > 0 || metrics.blockedTasks > 0) {
    stage.status = 'in_progress';
  } else if (metrics.completedTasks === 0 && stage.status === 'completed') {
    stage.status = 'not_started';
  }
};

function ensureStages(projectId) {
  if (!stageData.has(projectId)) {
    stageData.set(projectId, buildStagesForProject(projectId));
  }
  return stageData.get(projectId);
}

export const stageStore = {
  getTemplateDefinition() {
    return buildTemplateFromStages(templateStages);
  },
  replaceTemplateDefinition(stagesInput) {
    const sanitised = sanitiseTemplateStages(stagesInput);
    templateStages = sanitised.map(cloneTemplateStageDefinition);
    return buildTemplateFromStages(templateStages);
  },
  seedProjectStages(projectId) {
    ensureStages(projectId);
  },
  list(projectId) {
    return ensureStages(projectId).map(cloneStage);
  },
  projectProgress(projectId) {
    return computeProjectProgress(ensureStages(projectId));
  },
  updateStatus({ projectId, stageId, status }) {
    if (!allowedStatuses.has(status)) {
      throw new Error('Invalid status value');
    }
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }
    stage.status = status;
    return cloneStage(stage);
  },
  create({ projectId, name, dueDate }) {
    const stages = ensureStages(projectId);
    const id = `${projectId}-stage-${randomUUID().slice(0, 8)}`;
    const stage = {
      id,
      templateSlug: null,
      name,
      description: '',
      status: 'not_started',
      dueDate: dueDate ?? null,
      defaultDueOffsetDays: null,
      permissions: { viewRoles: ['owner', 'staff'], taskUpdateRoles: ['owner', 'staff'], checklistEditRoles: ['owner', 'staff'], clientCanUpload: false },
      tasks: [],
      uploads: [],
      toggles: []
    };
    stages.push(stage);
    return cloneStage(stage);
  },
  addTask({ projectId, stageId, title, dueDate, assignee }) {
    if (!title) throw new Error('Task title is required');
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const id = `${stageId}-task-${stage.tasks.length + 1}`;
    const task = {
      id,
      templateSlug: null,
      title,
      state: 'not_started',
      dueDate: dueDate ?? null,
      assignee: assignee ?? '',
      ownerRole: assignee ? null : 'staff',
      requiresClientInput: false,
      requiredUploadIds: []
    };
    stage.tasks.push(task);
    recalculateStageStatus(stage);
    return { ...task };
  },
  updateTaskStatus({ projectId, stageId, taskId, state }) {
    if (!allowedTaskStatuses.has(state)) {
      throw new Error('Invalid task state');
    }
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const task = stage.tasks.find(item => item.id === taskId);
    if (!task) throw new Error('Task not found');
    task.state = state;
    recalculateStageStatus(stage);
    return { ...task };
  },
  updateToggle({ projectId, stageId, toggleId, value }) {
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const toggle = stage.toggles.find(item => item.templateToggleId === toggleId || item.id === toggleId);
    if (!toggle) throw new Error('Checklist item not found');
    toggle.value = Boolean(value);
    return { ...toggle };
  },
  addToggle({ projectId, stageId, label, defaultValue = false }) {
    if (!label || !label.trim()) throw new Error('Checklist label is required');
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const id = `${stageId}-toggle-${randomUUID().slice(0, 8)}`;
    const toggle = {
      id,
      templateToggleId: null,
      label: label.trim(),
      value: Boolean(defaultValue)
    };
    stage.toggles.push(toggle);
    return { ...toggle };
  },
  removeToggle({ projectId, stageId, toggleId }) {
    const stages = ensureStages(projectId);
    const stage = stages.find(item => item.id === stageId);
    if (!stage) throw new Error('Stage not found');
    const index = stage.toggles.findIndex(item => item.templateToggleId === toggleId || item.id === toggleId);
    if (index === -1) throw new Error('Checklist item not found');
    const [removed] = stage.toggles.splice(index, 1);
    return removed ? { ...removed } : null;
  },
  refreshProjectStages(projectId) {
    // Clear the cached stages for this project and rebuild from the current template
    stageData.delete(projectId);
    return ensureStages(projectId).map(cloneStage);
  },
  refreshAllProjectStages() {
    // Clear all cached project stages and rebuild from the current template
    const projectIds = Array.from(stageData.keys());
    stageData.clear();
    return projectIds;
  }
};

export const stageStatuses = [...allowedStatuses];
export const taskStatuses = [...allowedTaskStatuses];
