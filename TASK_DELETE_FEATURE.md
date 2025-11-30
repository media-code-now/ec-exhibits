# Task Delete Feature Implementation

## Summary

Added a "Delete" button for each task in the "Manage Project Stages & Tasks" section of the Projects tab.

## Changes Made

### 1. Backend - DELETE Endpoint (`server/index.js`)

**New Endpoint**: `DELETE /projects/:projectId/stages/:stageId/tasks/:taskId`

**Location**: Line ~1627 (after PATCH task endpoint)

**Features**:
- ✅ Authentication required
- ✅ Permission check (only owners and staff can delete tasks)
- ✅ Validates project exists and user is a member
- ✅ Validates task exists and belongs to the specified stage
- ✅ Deletes task from database using Prisma
- ✅ Sends notifications to all project members
- ✅ Logs deletion with `[TASK DELETE]` prefix

**Response**:
```json
{
  "success": true,
  "task": { /* deleted task object */ }
}
```

### 2. Frontend - ProgressStages Component (`client/src/components/ProgressStages.jsx`)

**Changes**:

1. **Added new prop**: `onTaskDelete`
   - Line 27: Added to function signature
   - Callback function: `(stageId, taskId) => void`

2. **Added Delete button** (Lines ~207-219):
   - Appears next to the status dropdown for each task
   - Only visible when `canEdit={true}` (owners only)
   - Styled with rose colors to indicate destructive action
   - Shows confirmation dialog before deletion
   - Text: "Delete"

**Button Design**:
```jsx
<button
  type="button"
  onClick={() => {
    if (confirm(`Delete task "${task.title}"?`)) {
      onTaskDelete?.(stage.id, task.id);
    }
  }}
  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600 hover:bg-rose-50 transition"
  title="Delete task"
>
  Delete
</button>
```

### 3. Frontend - Dashboard Component (`client/src/components/Dashboard.jsx`)

**Changes**:

1. **Added deleteTaskMutation** (Lines ~127-138):
```jsx
const deleteTaskMutation = useMutation({
  mutationFn: ({ stageId, taskId }) =>
    axios.delete(`/projects/${project.id}/stages/${stageId}/tasks/${taskId}`),
  onSuccess: () => {
    queryClient.invalidateQueries(['stages', project.id]);
  },
  onError: (error) => {
    console.error('[Mutation] Failed to delete task:', error);
    alert(error.response?.data?.error || 'Failed to delete task');
  }
});
```

2. **Wired up onTaskDelete prop** (Line ~901):
```jsx
<ProgressStages
  {/* ...other props */}
  onTaskDelete={(stageId, taskId) =>
    deleteTaskMutation.mutate({ stageId, taskId })
  }
/>
```

## User Experience Flow

1. **User navigates** to Projects tab → "Manage Project Stages & Tasks" section
2. **Expands a stage** to see its tasks
3. **Each task shows**:
   - Task title and due date
   - Status dropdown (for owners)
   - **NEW: Delete button** (for owners)
4. **Clicks "Delete"** button
5. **Confirmation dialog** appears: "Delete task '[task title]'?"
6. **If confirmed**:
   - Task is deleted from database
   - UI refreshes automatically (React Query cache invalidation)
   - Task disappears from the list
   - Progress bar updates (since it counts completed tasks)
   - All project members receive notification
7. **If error occurs**: Alert shows error message

## Permissions

- ✅ **Owners**: Can delete tasks
- ✅ **Staff**: Can delete tasks
- ❌ **Clients**: Cannot delete tasks (button not shown)

## Technical Details

### Database Operation
- Uses Prisma `delete()` method
- Cascading deletes handled by database foreign key constraints
- Transaction safety ensured by Prisma client

### State Management
- React Query handles cache invalidation
- Query key: `['stages', project.id]`
- Automatic UI refresh after deletion
- No manual state updates needed

### Notifications
- Type: `task_deleted`
- Sent to all project members except the actor
- Includes: stage name, task title, actor name
- Real-time delivery via Socket.io

### Error Handling
- Frontend: Alert dialog with error message
- Backend: Proper HTTP status codes
  - 404: Task or project not found
  - 403: Insufficient permissions
  - 500: Server error
- Console logging for debugging

## Testing Checklist

✅ **Test as Owner**:
1. Navigate to Projects tab → Manage Project Stages & Tasks
2. Expand a stage with tasks
3. Verify "Delete" button appears next to each task
4. Click "Delete" button
5. Confirm deletion in dialog
6. Verify task disappears from list
7. Verify progress bar updates

✅ **Test as Staff**:
1. Same as owner test
2. Verify staff can also delete tasks

✅ **Test as Client**:
1. Navigate to Projects tab
2. Verify "Delete" button does NOT appear
3. Client should only see task status (read-only)

✅ **Test Edge Cases**:
1. Try deleting last task in a stage
2. Try deleting task from completed stage
3. Verify notifications sent to team members
4. Test with slow network connection

## Files Modified

1. `/server/index.js` - Added DELETE endpoint (~90 lines)
2. `/client/src/components/ProgressStages.jsx` - Added delete button (~15 lines)
3. `/client/src/components/Dashboard.jsx` - Added mutation and wired up callback (~15 lines)

## Related Features

- Progress bar now accurately reflects when tasks are deleted
- Task count in progress summary updates automatically
- Stage progress percentage recalculates
- Overdue task checker no longer tracks deleted tasks

## Future Enhancements

Possible improvements for later:
- Soft delete (mark as deleted instead of removing)
- Undo deletion feature
- Bulk delete multiple tasks
- Delete confirmation with task details
- Audit log of deleted tasks
