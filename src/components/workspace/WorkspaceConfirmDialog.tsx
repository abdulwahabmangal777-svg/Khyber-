import React from 'react';
import { AlertTriangle, Send, Trash2, CheckCircle2, MessageSquare, ListTodo, X, Contact, Users } from 'lucide-react';

export type WorkspaceActionType =
  | 'SEND_EMAIL'
  | 'TRASH_EMAIL'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'SEND_CHAT'
  | 'CREATE_SPACE'
  | 'CREATE_CONTACT'
  | 'UPDATE_CONTACT'
  | 'DELETE_CONTACT'
  | 'SYNC_CONTACTS';

interface WorkspaceConfirmDialogProps {
  isOpen: boolean;
  type: WorkspaceActionType;
  title: string;
  description: string;
  details?: { label: string; value: string | React.ReactNode }[];
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const WorkspaceConfirmDialog: React.FC<WorkspaceConfirmDialogProps> = ({
  isOpen,
  type,
  title,
  description,
  details = [],
  confirmLabel,
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'SEND_EMAIL':
        return <Send className="w-6 h-6 text-blue-600" />;
      case 'TRASH_EMAIL':
      case 'DELETE_TASK':
      case 'DELETE_CONTACT':
        return <Trash2 className="w-6 h-6 text-red-600" />;
      case 'CREATE_TASK':
      case 'UPDATE_TASK':
        return <ListTodo className="w-6 h-6 text-emerald-600" />;
      case 'SEND_CHAT':
      case 'CREATE_SPACE':
        return <MessageSquare className="w-6 h-6 text-indigo-600" />;
      case 'CREATE_CONTACT':
      case 'UPDATE_CONTACT':
        return <Contact className="w-6 h-6 text-amber-600" />;
      case 'SYNC_CONTACTS':
        return <Users className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getDefaultConfirmText = () => {
    if (confirmLabel) return confirmLabel;
    switch (type) {
      case 'SEND_EMAIL': return 'Confirm & Send Email';
      case 'TRASH_EMAIL': return 'Move to Trash';
      case 'CREATE_TASK': return 'Create Google Task';
      case 'UPDATE_TASK': return 'Update Task';
      case 'DELETE_TASK': return 'Delete Task';
      case 'SEND_CHAT': return 'Send to Space';
      case 'CREATE_SPACE': return 'Create Space';
      case 'CREATE_CONTACT': return 'Create Contact';
      case 'UPDATE_CONTACT': return 'Save Contact Changes';
      case 'DELETE_CONTACT': return 'Delete Contact';
      case 'SYNC_CONTACTS': return 'Sync to Google Contacts';
      default: return 'Confirm Action';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-5 flex items-start gap-4 border-b border-slate-100 bg-slate-50/50">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {title}
              </h3>
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Detailed Action Preview */}
        {details.length > 0 && (
          <div className="p-5 bg-slate-50/30 space-y-2.5 max-h-60 overflow-y-auto border-b border-slate-100">
            {details.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-start text-xs gap-1 sm:gap-3">
                <span className="font-semibold text-slate-500 w-24 shrink-0 sm:text-right">
                  {item.label}:
                </span>
                <span className="text-slate-800 font-medium break-words flex-1">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Google Workspace Permission Notice */}
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100/60 flex items-center gap-2 text-[11px] text-amber-900">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Executing with authenticated permission from your connected Google Workspace account.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-600/20'
            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{getDefaultConfirmText()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
