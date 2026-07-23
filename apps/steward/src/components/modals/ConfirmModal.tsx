import React from "react";

export interface ConfirmActionState {
  message: string;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  confirmAction: ConfirmActionState;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  confirmAction,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#14171F] border border-[#1e232e] p-6 rounded-xl shadow-2xl max-w-sm w-full">
        <h3 className="text-lg font-bold text-slate-200 mb-2">Confirmation Required</h3>
        <p className="text-sm text-slate-400 mb-6">{confirmAction.message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              confirmAction.onConfirm();
              onCancel();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-red-900/20 cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
