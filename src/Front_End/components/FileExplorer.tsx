import { useState } from 'react';
import {
  ChevronRight, ChevronDown, FilePlus, FolderPlus, Trash2,
  FileText, FileCode, FileJson, FileType, Hash, FileBrackets,
} from 'lucide-react';
import type { FileNode } from '@/lib/fileSystem';

type Props = {
  nodes: FileNode[];
  activePath: string | null;
  onSelectFile: (path: string) => void;
  onCreate: (parentPath: string, name: string, isDir: boolean) => void;
  onDelete: (path: string) => void;
};

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const cls = 'w-4 h-4 flex-shrink-0';

  if (ext === 'tsx' || ext === 'jsx') return <FileBrackets className={cls + ' text-cyan-400'} />;
  if (ext === 'ts') return <FileCode className={cls + ' text-blue-400'} />;
  if (ext === 'js') return <FileCode className={cls + ' text-yellow-400'} />;
  if (ext === 'json') return <FileJson className={cls + ' text-amber-400'} />;
  if (ext === 'css') return <Hash className={cls + ' text-pink-400'} />;
  if (ext === 'html') return <FileType className={cls + ' text-orange-400'} />;
  if (ext === 'md') return <FileText className={cls + ' text-slate-400'} />;
  return <FileText className={cls + ' text-slate-500'} />;
}

export function FileExplorer({ nodes, activePath, onSelectFile, onCreate, onDelete }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['src', 'src/components', 'src/hooks']));
  const [creating, setCreating] = useState<{ parentPath: string; isDir: boolean } | null>(null);
  const [newName, setNewName] = useState('');

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const startCreate = (parentPath: string, isDir: boolean) => {
    setCreating({ parentPath, isDir });
    setNewName('');
    if (parentPath && !expanded.has(parentPath)) {
      setExpanded((prev) => new Set(prev).add(parentPath));
    }
  };

  const confirmCreate = () => {
    if (creating && newName.trim()) {
      const trimmed = newName.trim();
      const parentPath = creating.parentPath;
      const newPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
      onCreate(parentPath, newPath, creating.isDir);
      if (creating.isDir) {
        setExpanded((prev) => new Set(prev).add(newPath));
      }
    }
    setCreating(null);
    setNewName('');
  };

  const renderNode = (node: FileNode, depth: number): React.ReactNode => {
    const indent = { paddingLeft: `${depth * 12 + 8}px` };

    if (node.isDir) {
      const isOpen = expanded.has(node.path);
      return (
        <div key={node.path}>
          <div
            className="group flex items-center gap-1 py-1 pr-2 cursor-pointer hover:bg-slate-700/40 transition-colors"
            style={indent}
            onClick={() => toggle(node.path)}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
            <span className="text-sm text-slate-300 truncate">{node.name}</span>
            <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); startCreate(node.path, false); }}
                className="p-1 hover:bg-slate-600 rounded"
                title="New file"
              >
                <FilePlus className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); startCreate(node.path, true); }}
                className="p-1 hover:bg-slate-600 rounded"
                title="New folder"
              >
                <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
                className="p-1 hover:bg-slate-600 rounded"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
          {isOpen && (
            <>
              {node.children?.map((child) => renderNode(child, depth + 1))}
              {creating?.parentPath === node.path && (
                <CreateInput
                  depth={depth + 1}
                  isDir={creating.isDir}
                  value={newName}
                  onChange={setNewName}
                  onConfirm={confirmCreate}
                  onCancel={() => setCreating(null)}
                />
              )}
            </>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={`group flex items-center gap-1.5 py-1 pr-2 cursor-pointer transition-colors ${
          activePath === node.path ? 'bg-blue-600/20' : 'hover:bg-slate-700/40'
        }`}
        style={indent}
        onClick={() => onSelectFile(node.path)}
      >
        <FileIcon name={node.name} />
        <span className={`text-sm truncate ${activePath === node.path ? 'text-white' : 'text-slate-300'}`}>
          {node.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
          className="ml-auto p-1 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => startCreate('', false)}
            className="p-1 hover:bg-slate-600 rounded transition-colors"
            title="New file at root"
          >
            <FilePlus className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={() => startCreate('', true)}
            className="p-1 hover:bg-slate-600 rounded transition-colors"
            title="New folder at root"
          >
            <FolderPlus className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {nodes.map((node) => renderNode(node, 0))}
        {creating?.parentPath === '' && (
          <CreateInput
            depth={0}
            isDir={creating.isDir}
            value={newName}
            onChange={setNewName}
            onConfirm={confirmCreate}
            onCancel={() => setCreating(null)}
          />
        )}
      </div>
    </div>
  );
}

function CreateInput({
  depth, isDir, value, onChange, onConfirm, onCancel,
}: {
  depth: number;
  isDir: boolean;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 py-1 pr-2"
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {isDir ? (
        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
      ) : (
        <span className="w-4 h-4 flex-shrink-0" />
      )}
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onConfirm}
        placeholder={isDir ? 'folder name' : 'file name'}
        className="flex-1 px-2 py-0.5 bg-slate-900 border border-blue-500 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}
