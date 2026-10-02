import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ListTodo,
  RefreshCw,
  FolderPlus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  X,
  ShieldCheck,
  LogOut,
  Truck,
  Users
} from 'lucide-react';
import { useGoogleWorkspace } from '../context/GoogleWorkspaceContext';
import { GoogleSignInButton } from '../components/workspace/GoogleSignInButton';
import {
  fetchTaskLists,
  fetchTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
  createTaskList,
  GoogleTaskList,
  GoogleTaskItem
} from '../services/tasksApi';
import { WorkspaceConfirmDialog } from '../components/workspace/WorkspaceConfirmDialog';

export const GoogleTasksView: React.FC = () => {
  const { user, accessToken, isAuthenticated, isLoading: authLoading, signIn, signOut } = useGoogleWorkspace();

  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Task Modal State
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  // New List Modal State
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'CREATE_TASK' | 'DELETE_TASK' | 'UPDATE_TASK';
    title: string;
    description: string;
    details?: { label: string; value: string | React.ReactNode }[];
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: 'CREATE_TASK',
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Load Task Lists
  const loadLists = useCallback(async () => {
    if (!accessToken) return;
    setLoadingLists(true);
    setError(null);
    try {
      const lists = await fetchTaskLists(accessToken);
      setTaskLists(lists);
      if (lists.length > 0 && !selectedListId) {
        setSelectedListId(lists[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching Google Task lists:', err);
      setError(err.message || 'Failed to load task lists');
    } finally {
      setLoadingLists(false);
    }
  }, [accessToken, selectedListId]);

  // Load Tasks for selected list
  const loadTasksForList = useCallback(async (listId: string) => {
    if (!accessToken || !listId) return;
    setLoadingTasks(true);
    setError(null);
    try {
      const items = await fetchTasks(accessToken, listId);
      setTasks(items);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadLists();
    }
  }, [isAuthenticated, accessToken, loadLists]);

  useEffect(() => {
    if (selectedListId && accessToken) {
      loadTasksForList(selectedListId);
    }
  }, [selectedListId, accessToken, loadTasksForList]);

  // Toggle task status
  const handleToggleTask = async (task: GoogleTaskItem) => {
    if (!accessToken || !selectedListId) return;
    const newStatus = task.status !== 'completed';
    // Optimistic UI update
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus ? 'completed' : 'needsAction' } : t))
    );

    try {
      await updateGoogleTaskStatus(accessToken, selectedListId, task.id, newStatus);
    } catch (err: any) {
      // Revert on error
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setError(err.message || 'Failed to update task status');
    }
  };

  // Submit New Task (prompts confirmation dialog as required)
  const handleInitiateCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setError('Please provide a task title.');
      return;
    }

    const currentListName = taskLists.find(l => l.id === selectedListId)?.title || 'Task List';

    setConfirmDialog({
      isOpen: true,
      type: 'CREATE_TASK',
      title: 'Confirm Create Google Task',
      description: `Create a new task in list "${currentListName}" on your Google account.`,
      isDestructive: false,
      details: [
        { label: 'List', value: currentListName },
        { label: 'Title', value: newTaskTitle },
        ...(newTaskNotes ? [{ label: 'Notes', value: newTaskNotes }] : []),
        ...(newTaskDue ? [{ label: 'Due Date', value: newTaskDue }] : [])
      ],
      onConfirm: async () => {
        if (!accessToken || !selectedListId) return;
        setActionLoading(true);
        try {
          const dueIso = newTaskDue ? new Date(newTaskDue).toISOString() : undefined;
          await createGoogleTask(accessToken, selectedListId, {
            title: newTaskTitle.trim(),
            notes: newTaskNotes.trim() || undefined,
            due: dueIso
          });
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setIsNewTaskOpen(false);
          setNewTaskTitle('');
          setNewTaskNotes('');
          setNewTaskDue('');
          loadTasksForList(selectedListId);
        } catch (err: any) {
          setError(err.message || 'Failed to create task');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Delete Task (prompts destructive confirmation dialog)
  const handleInitiateDeleteTask = (task: GoogleTaskItem) => {
    setConfirmDialog({
      isOpen: true,
      type: 'DELETE_TASK',
      title: 'Confirm Delete Task',
      description: 'Are you sure you want to permanently delete this task from Google Tasks?',
      isDestructive: true,
      details: [
        { label: 'Task Title', value: task.title },
        ...(task.notes ? [{ label: 'Notes', value: task.notes }] : [])
      ],
      onConfirm: async () => {
        if (!accessToken || !selectedListId) return;
        setActionLoading(true);
        try {
          await deleteGoogleTask(accessToken, selectedListId, task.id);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (err: any) {
          setError(err.message || 'Failed to delete task');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Create New Task List
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !accessToken) return;
    setActionLoading(true);
    try {
      const created = await createTaskList(accessToken, newListTitle.trim());
      setTaskLists(prev => [...prev, created]);
      setSelectedListId(created.id);
      setIsNewListOpen(false);
      setNewListTitle('');
    } catch (err: any) {
      setError(err.message || 'Failed to create task list');
    } finally {
      setActionLoading(false);
    }
  };

  // Pre-fill quick fleet task
  const handleQuickFleetTask = (title: string, notes: string) => {
    setNewTaskTitle(title);
    setNewTaskNotes(notes);
    // Set due date to 7 days from now
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setNewTaskDue(nextWeek.toISOString().split('T')[0]);
    setIsNewTaskOpen(true);
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Not Connected State
  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
            <ListTodo className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Google Tasks for Fleet Operations & Compliance
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
            Synchronize your fleet maintenance action items, driver Iqama renewals, and periodic vehicle inspections directly with Google Tasks to receive real-time mobile reminders across your Android/iOS devices and Google Calendar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GoogleSignInButton
              onClick={signIn}
              loading={authLoading}
              text="Connect Google Tasks"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 max-w-lg mx-auto text-left">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Fleet Task Features:
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Organize tasks into custom lists (e.g. "Fleet Maintenance", "Iqama Deadlines")</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mark items complete with interactive state synchronization</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automated compliance templates for MVPI, insurance, and driver licenses</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Google Tasks Hub
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Syncing with <span className="font-semibold text-slate-700">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsNewTaskOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewListOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New List</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedListId) loadTasksForList(selectedListId);
              loadLists();
            }}
            disabled={loadingTasks || loadingLists}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs transition-colors"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTasks || loadingLists ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={signOut}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Disconnect Google Account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>

      {/* Quick Fleet Actions Bar */}
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-xs font-bold text-emerald-950">Quick Fleet Automation:</span>
          <span className="text-xs text-emerald-800">Add pre-configured compliance deadlines to Google Tasks</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleQuickFleetTask(
              'Renew Saudi Iqama & Health Insurance for Driver',
              'Verify Qiwa digital contract, initiate Muqeem Iqama renewal, and ensure CCHI valid health insurance.'
            )}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Iqama Task</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickFleetTask(
              'Schedule Periodic MVPI (Fahas الدوري) Inspection',
              'Dispatch heavy truck to SASO/MVPI testing center and upload roadworthiness certificate.'
            )}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ MVPI Inspection</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Task Lists Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {taskLists.map(list => {
          const isSelected = selectedListId === list.id;
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelectedListId(list.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>{list.title}</span>
            </button>
          );
        })}
      </div>

      {/* Tasks Content List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* List Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {taskLists.find(l => l.id === selectedListId)?.title || 'Tasks'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
              {pendingTasks.length} pending
            </span>
          </div>
        </div>

        {/* Tasks View Body */}
        <div className="p-6">
          {loadingTasks ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Syncing tasks from Google Tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold text-slate-700">No tasks in this list</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create a task or click the quick fleet automation buttons above to add your first deadline.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Action Items ({pendingTasks.length})
                  </h4>
                  {pendingTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 transition-all flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Mark complete"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 leading-snug">
                            {task.title}
                          </h5>
                          {task.notes && (
                            <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                              {task.notes}
                            </p>
                          )}
                          {task.due && (
                            <div className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Due: {new Date(task.due).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-80 group-hover:opacity-100 transition-all"
                        title="Delete Task (Requires Confirmation)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Completed ({completedTasks.length})
                  </h4>
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className="mt-0.5 text-emerald-600 hover:text-slate-400 transition-colors"
                          title="Mark incomplete"
                        >
                          <CheckSquare className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-medium text-slate-500 line-through leading-snug">
                            {task.title}
                          </h5>
                          {task.notes && (
                            <p className="text-[11px] text-slate-400 mt-1 line-through">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInitiateDeleteTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ListTodo className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  New Google Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Renew MVPI Inspection for Truck #204"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes & Details (Optional)
                </label>
                <textarea
                  rows={4}
                  value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                  placeholder="Include vehicle plate, driver name, or compliance instructions..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={e => setNewTaskDue(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs shadow-emerald-600/20"
                >
                  Review & Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New List Modal */}
      {isNewListOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Create New Task List
              </h3>
              <button
                type="button"
                onClick={() => setIsNewListOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateList} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  List Name *
                </label>
                <input
                  type="text"
                  required
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  placeholder="e.g. Fleet Maintenance or Driver Documents"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewListOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {actionLoading ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog */}
      <WorkspaceConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        description={confirmDialog.description}
        details={confirmDialog.details}
        isDestructive={confirmDialog.isDestructive}
        isLoading={actionLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
