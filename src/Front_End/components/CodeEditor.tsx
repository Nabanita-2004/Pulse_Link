import { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { X, Circle, Users } from 'lucide-react';
import type { FileNode } from '@/lib/fileSystem';
import { getLanguageFromPath, findNode } from '@/lib/fileSystem';

type Props = {
  nodes: FileNode[];
  activePath: string | null;
  openTabs: string[];
  onSelectFile: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  remoteEditingPath: string | null;
  remoteEditorName: string | null;
};

export function CodeEditor({
  nodes, activePath, openTabs, onSelectFile, onCloseTab, onContentChange,
  remoteEditingPath, remoteEditorName,
}: Props) {
  const editorRef = useRef<any>(null);
  const [isDirty, setIsDirty] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFile = activePath ? findNode(nodes, activePath) : null;
  const language = activePath ? getLanguageFromPath(activePath) : 'plaintext';

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activePath || value === undefined) return;
    setIsDirty((prev) => new Set(prev).add(activePath));
    onContentChange(activePath, value);
  }, [activePath, onContentChange]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (activePath) {
      debounceRef.current = setTimeout(() => {
        setIsDirty((prev) => {
          const next = new Set(prev);
          next.delete(activePath);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activePath]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Tab bar */}
      <div className="flex items-center bg-[#252526] border-b border-black/30 overflow-x-auto flex-shrink-0">
        {openTabs.length === 0 ? (
          <div className="px-4 py-2 text-xs text-slate-500">No files open</div>
        ) : (
          openTabs.map((path) => {
            const name = path.split('/').pop() ?? path;
            const isActive = path === activePath;
            const dirty = isDirty.has(path);
            const isRemoteEditing = remoteEditingPath === path;
            return (
              <div
                key={path}
                onClick={() => onSelectFile(path)}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-black/20 transition-colors ${
                  isActive ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] hover:bg-[#333333]'
                }`}
              >
                <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                {dirty && <Circle className="w-2 h-2 fill-current text-slate-400" />}
                {isRemoteEditing && (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                    <Users className="w-3 h-3" />
                    {remoteEditorName}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onCloseTab(path); }}
                  className="p-0.5 hover:bg-slate-600 rounded opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Monaco editor */}
      <div className="flex-1 overflow-hidden">
        {activeFile && !activeFile.isDir ? (
          <Editor
            key={activePath}
            height="100%"
            language={language}
            value={activeFile.content ?? ''}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
              fontLigatures: true,
              minimap: { enabled: true, scale: 1 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              padding: { top: 12, bottom: 12 },
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
              <span className="text-3xl font-mono text-slate-500">{'</>'}</span>
            </div>
            <p className="text-sm text-slate-500">Select a file to start editing</p>
            <p className="text-xs text-slate-600 mt-1">Edits sync in real-time with all participants</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#007acc] text-white text-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>{language.toUpperCase()}</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
        <div className="flex items-center gap-3">
          {activeFile && (
            <span className="text-white/80">{activeFile.content?.split('\n').length ?? 0} lines</span>
          )}
          {remoteEditingPath && remoteEditingPath !== activePath && (
            <span className="flex items-center gap-1 text-white/90">
              <Users className="w-3 h-3" />
              {remoteEditorName} editing {remoteEditingPath.split('/').pop()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
