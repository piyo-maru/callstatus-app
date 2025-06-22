interface LoadingSpinnerProps {
  message?: string;
  overlay?: boolean;
}

export default function LoadingSpinner({ 
  message = "読み込み中...", 
  overlay = true 
}: LoadingSpinnerProps) {
  const content = (
    <div className="bg-white p-6 rounded-lg flex items-center space-x-3 shadow-xl border-2 border-blue-200">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="text-lg font-medium text-gray-700">{message}</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10001]">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      {content}
    </div>
  );
}