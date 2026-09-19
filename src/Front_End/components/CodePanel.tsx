import { useEffect, useState, useCallback, useRef } from 'react';
import { FileExplorer } from '@/components/FileExplorer';
import { CodeEditor } from '@/components/CodeEditor';
import {
  type FileNode,
  DEFAULT_PROJECT,
  findNode,
  updateNodeContent,
  addNode,
  deleteNode,
  sortNodes,
  getParentPath,
} from '@/lib/fileSystem';

type Props = {
  subscribe: (fn: (msg: any) => void) => () => void;
  onCodeSync: (path: string, content: string) => void;
  onCodeOpen: (path: string) => void;
  onCodeCreate: (path: string, isDir: boolean) => void;
  onCodeDelete: (path: string) => void;
  displayName: string;
};

export function CodePanel({
  subscribe, onCodeSync, onCodeOpen, onCodeCreate, onCodeDelete, displayName,
}: Props) {
  const [nodes, setNodes] = useState<FileNode[]>(DEFAULT_PROJECT);
  const [openTabs, setOpenTabs] = useState<string[]>(['src/App.tsx']);
  const [activePath, setActivePath] = useState<string | null>('src/App.tsx');
  const [remoteEditing, setRemoteEditing] = useState<{ path: string; name: string } | null>(null);
  const remoteEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemoteRef = useRef(false);

  // Subscribe to remote code events
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'code-sync' && msg.from !== undefined) {
        isApplyingRemoteRef.current = true;
        setNodes((prev) => updateNodeContent(prev, msg.path, msg.content));
        setRemoteEditing({ path: msg.path, name: msg.displayName || 'Participant' });
        if (remoteEditTimeoutRef.current) clearTimeout(remoteEditTimeoutRef.current);
        remoteEditTimeoutRef.current = setTimeout(() => setRemoteEditing(null), 3000);
        setTimeout(() => { isApplyingRemoteRef.current = false; }, 100);
      } else if (msg.type === 'code-open') {
        setRemoteEditing({ path: msg.path, name: msg.displayName || 'Participant' });
        if (remoteEditTimeoutRef.current) clearTimeout(remoteEditTimeoutRef.current);
        remoteEditTimeoutRef.current = setTimeout(() => setRemoteEditing(null), 3000);
      } else if (msg.type === 'code-create') {
        const parent = getParentPath(msg.path);
        const name = msg.path.split('/').pop() ?? msg.path;
        const newNode: FileNode = {
          name,
          path: msg.path,
          isDir: msg.isDir,
          content: msg.isDir ? undefined : '',
          children: msg.isDir ? [] : undefined,
        };
        setNodes((prev) => addNode(prev, parent, newNode));
      } else if (msg.type === 'code-delete') {
        setNodes((prev) => deleteNode(prev, msg.path));
        setOpenTabs((prev) => prev.filter((p) => p !== msg.path));
        setActivePath((prev) => (prev === msg.path ? null : prev));
      } else if (msg.type === 'code-rename') {
        // Simplified: just update path references
        setNodes((prev) => {
          const node = findNode(prev, msg.oldPath);
          if (!node) return prev;
          const name = msg.newPath.split('/').pop() ?? msg.newPath;
          const updated = { ...node, path: msg.newPath, name };
          let result = deleteNode(prev, msg.oldPath);
          result = addNode(result, getParentPath(msg.newPath), updated);
          return result;
        });
      }
    });
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    return () => {
      if (remoteEditTimeoutRef.current) clearTimeout(remoteEditTimeoutRef.current);
    };
  }, []);

  const handleSelectFile = useCallback((path: string) => {
    setActivePath(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    onCodeOpen(path);
  }, [onCodeOpen]);

  const handleCloseTab = useCallback((path: string) => {
    setOpenTabs((prev) => prev.filter((p) => p !== path));
    setActivePath((prev) => {
      if (prev !== path) return prev;
      const remaining = openTabs.filter((p) => p !== path);
      return remaining.length > 0 ? remaining[remaining.length - 1] : null;
    });
  }, [openTabs]);

  const handleContentChange = useCallback((path: string, content: string) => {
    if (isApplyingRemoteRef.current) return;
    setNodes((prev) => updateNodeContent(prev, path, content));
    onCodeSync(path, content);
  }, [onCodeSync]);

  const handleCreate = useCallback((_parentPath: string, newPath: string, isDir: boolean) => {
    const name = newPath.split('/').pop() ?? newPath;
    const parent = getParentPath(newPath);
    const newNode: FileNode = {
      name,
      path: newPath,
      isDir,
      content: isDir ? undefined : '',
      children: isDir ? [] : undefined,
    };
    setNodes((prev) => addNode(prev, parent, newNode));
    onCodeCreate(newPath, isDir);
    if (!isDir) {
      setActivePath(newPath);
      setOpenTabs((prev) => [...prev, newPath]);
      onCodeOpen(newPath);
    }
  }, [onCodeCreate, onCodeOpen]);

  const handleDelete = useCallback((path: string) => {
    setNodes((prev) => deleteNode(prev, path));
    setOpenTabs((prev) => prev.filter((p) => p !== path));
    setActivePath((prev) => (prev === path ? null : prev));
    onCodeDelete(path);
  }, [onCodeDelete]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-56 flex-shrink-0 border-r border-slate-700/50 overflow-hidden">
        <FileExplorer
          nodes={nodes}
          activePath={activePath}
          onSelectFile={handleSelectFile}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          nodes={nodes}
          activePath={activePath}
          openTabs={openTabs}
          onSelectFile={handleSelectFile}
          onCloseTab={handleCloseTab}
          onContentChange={handleContentChange}
          remoteEditingPath={remoteEditing?.path ?? null}
          remoteEditorName={remoteEditing?.name ?? null}
        />
      </div>
    </div>
  );
}
