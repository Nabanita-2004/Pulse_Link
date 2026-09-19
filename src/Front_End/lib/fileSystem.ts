export type FileNode = {
  name: string;
  path: string;
  isDir: boolean;
  content?: string;
  children?: FileNode[];
};

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    sql: 'sql',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    xml: 'xml',
    txt: 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}

export function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'tsx' || ext === 'jsx') return 'react';
  if (ext === 'ts' || ext === 'js') return ext;
  if (ext === 'json') return 'json';
  if (ext === 'css') return 'css';
  if (ext === 'html') return 'html';
  if (ext === 'md') return 'md';
  if (ext === 'py') return 'py';
  return 'file';
}

export const DEFAULT_PROJECT: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    isDir: true,
    children: [
      {
        name: 'components',
        path: 'src/components',
        isDir: true,
        children: [
          {
            name: 'Button.tsx',
            path: 'src/components/Button.tsx',
            isDir: false,
            content: `import { useState } from 'react';\n\ntype ButtonProps = {\n  label: string;\n  onClick?: () => void;\n};\n\nexport function Button({ label, onClick }: ButtonProps) {\n  const [clicked, setClicked] = useState(false);\n\n  const handleClick = () => {\n    setClicked(!clicked);\n    onClick?.();\n  };\n\n  return (\n    <button\n      onClick={handleClick}\n      className={\n        'px-4 py-2 rounded-lg font-medium transition-all ' +\n        (clicked\n          ? 'bg-blue-600 text-white'\n          : 'bg-slate-200 text-slate-800 hover:bg-slate-300')\n      }\n    >\n      {label}\n    </button>\n  );\n}\n`,
          },
          {
            name: 'Card.tsx',
            path: 'src/components/Card.tsx',
            isDir: false,
            content: `type CardProps = {\n  title: string;\n  description: string;\n};\n\nexport function Card({ title, description }: CardProps) {\n  return (\n    <div className=\"p-6 bg-white rounded-xl shadow-md border border-slate-100\">\n      <h3 className=\"text-lg font-semibold text-slate-800\">{title}</h3>\n      <p className=\"text-sm text-slate-500 mt-2\">{description}</p>\n    </div>\n  );\n}\n`,
          },
        ],
      },
      {
        name: 'hooks',
        path: 'src/hooks',
        isDir: true,
        children: [
          {
            name: 'useCounter.ts',
            path: 'src/hooks/useCounter.ts',
            isDir: false,
            content: `import { useState, useCallback } from 'react';\n\nexport function useCounter(initial: number = 0) {\n  const [count, setCount] = useState(initial);\n\n  const increment = useCallback(() => setCount((c) => c + 1), []);\n  const decrement = useCallback(() => setCount((c) => c - 1), []);\n  const reset = useCallback(() => setCount(initial), [initial]);\n\n  return { count, increment, decrement, reset };\n}\n`,
          },
        ],
      },
      {
        name: 'App.tsx',
        path: 'src/App.tsx',
        isDir: false,
        content: `import { Button } from './components/Button';\nimport { Card } from './components/Card';\n\nfunction App() {\n  return (\n    <div className=\"min-h-screen bg-slate-50 p-8\">\n      <div className=\"max-w-2xl mx-auto space-y-6\">\n        <h1 className=\"text-3xl font-bold text-slate-800\">My App</h1>\n        <Card\n          title=\"Welcome\"\n          description=\"Click the button below to get started.\"\n        />\n        <Button label=\"Click Me\" onClick={() => console.log('clicked')} />\n      </div>\n    </div>\n  );\n}\n\nexport default App;\n`,
      },
      {
        name: 'main.tsx',
        path: 'src/main.tsx',
        isDir: false,
        content: `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>\n);\n`,
      },
      {
        name: 'index.css',
        path: 'src/index.css',
        isDir: false,
        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n}\n`,
      },
    ],
  },
  {
    name: 'public',
    path: 'public',
    isDir: true,
    children: [
      {
        name: 'favicon.svg',
        path: 'public/favicon.svg',
        isDir: false,
        content: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"blue\" stroke-width=\"2\">\n  <circle cx=\"12\" cy=\"12\" r=\"10\" />\n</svg>\n`,
      },
    ],
  },
  {
    name: 'package.json',
    path: 'package.json',
    isDir: false,
    content: `{\n  \"name\": \"my-app\",\n  \"private\": true,\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"vite build\",\n    \"preview\": \"vite preview\"\n  },\n  \"dependencies\": {\n    \"react\": \"^18.3.1\",\n    \"react-dom\": \"^18.3.1\"\n  },\n  \"devDependencies\": {\n    \"typescript\": \"^5.5.3\",\n    \"vite\": \"^5.4.2\"\n  }\n}\n`,
  },
  {
    name: 'tsconfig.json',
    path: 'tsconfig.json',
    isDir: false,
    content: `{\n  \"compilerOptions\": {\n    \"target\": \"ES2020\",\n    \"module\": \"ESNext\",\n    \"jsx\": \"react-jsx\",\n    \"strict\": true,\n    \"moduleResolution\": \"bundler\",\n    \"noEmit\": true\n  },\n  \"include\": [\"src\"]\n}\n`,
  },
  {
    name: 'README.md',
    path: 'README.md',
    isDir: false,
    content: '# My App\n\nA React + TypeScript project built with Vite.\n\n## Getting Started\n\n```bash\nnpm install\nnpm run dev\n```\n\n## Features\n\n- Component-based architecture\n- TypeScript for type safety\n- Tailwind CSS for styling\n',
  },
];

// Helper functions for file tree operations

export function findNode(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.isDir && node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function updateNodeContent(nodes: FileNode[], path: string, content: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === path && !node.isDir) {
      return { ...node, content };
    }
    if (node.isDir && node.children) {
      return { ...node, children: updateNodeContent(node.children, path, content) };
    }
    return node;
  });
}

export function addNode(nodes: FileNode[], parentPath: string, newNode: FileNode): FileNode[] {
  if (!parentPath) {
    return [...nodes, newNode].sort(sortNodes);
  }
  return nodes.map((node) => {
    if (node.path === parentPath && node.isDir) {
      const children = node.children ?? [];
      return { ...node, children: [...children, newNode].sort(sortNodes) };
    }
    if (node.isDir && node.children) {
      return { ...node, children: addNode(node.children, parentPath, newNode) };
    }
    return node;
  });
}

export function deleteNode(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter((node) => node.path !== path)
    .map((node) => {
      if (node.isDir && node.children) {
        return { ...node, children: deleteNode(node.children, path) };
      }
      return node;
    });
}

export function renameNode(nodes: FileNode[], oldPath: string, newPath: string, newName: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === oldPath) {
      const updated = { ...node, path: newPath, name: newName };
      if (node.isDir && node.children) {
        updated.children = node.children.map((child) => updateChildPaths(child, oldPath, newPath));
      }
      return updated;
    }
    if (node.isDir && node.children) {
      return { ...node, children: renameNode(node.children, oldPath, newPath, newName) };
    }
    return node;
  });
}

function updateChildPaths(node: FileNode, oldParent: string, newParent: string): FileNode {
  const newPath = newParent + node.path.slice(oldParent.length);
  const updated = { ...node, path: newPath };
  if (node.isDir && node.children) {
    updated.children = node.children.map((c) => updateChildPaths(c, oldParent, newParent));
  }
  return updated;
}

export function sortNodes(a: FileNode, b: FileNode): number {
  if (a.isDir && !b.isDir) return -1;
  if (!a.isDir && b.isDir) return 1;
  return a.name.localeCompare(b.name);
}

export function getParentPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}
