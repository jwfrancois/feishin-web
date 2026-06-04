import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

interface Props {
  onClose: () => void;
}

export function KeyboardShortcutsModal({ onClose }: Props) {
  const groups = KEYBOARD_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.group]) acc[shortcut.group] = [];
    acc[shortcut.group].push(shortcut);
    return acc;
  }, {} as Record<string, typeof KEYBOARD_SHORTCUTS>);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Keyboard className="w-6 h-6 text-player-accent" />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(groups).map(([group, shortcuts]) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide mb-3">
                {group}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 px-3 bg-neutral-800/50 rounded-lg"
                  >
                    <span className="text-neutral-300">{shortcut.action}</span>
                    <kbd className="px-2 py-1 bg-neutral-700 rounded text-sm font-mono text-white">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
          <p className="text-sm text-neutral-500">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-xs font-mono">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
