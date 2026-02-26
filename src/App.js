import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import './App.css';

// ================= Window Component =================
const Window = ({
  id,
  title,
  children,
  isMinimized,
  isFullscreen,
  onClose,
  onMinimize,
  onToggleFullscreen,
}) => {
  const windowClassNames = `window ${isFullscreen ? 'fullscreen' : ''} ${isMinimized ? 'minimized' : ''}`;

  const defaultSize = { width: 300, height: 200 };
  const fullscreenSize = { width: '100%', height: '100%' };

  const [size, setSize] = useState(defaultSize);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      setSize(defaultSize);
      setPosition({ x: 50, y: 50 });
    } else {
      setSize(fullscreenSize);
      setPosition({ x: 0, y: 0 });
    }
    onToggleFullscreen(id);
  };

  return (
    <Rnd
      size={size}
      position={position}
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        setSize({
          width: ref.style.width,
          height: ref.style.height,
        });
        setPosition(position);
      }}
      bounds="parent"
      className={windowClassNames}
      enableResizing={!isFullscreen && !isMinimized}
      disableDragging={isFullscreen || isMinimized}
      dragHandleClassName="window-header"
    >
      <div>
        <div className="window-header">
          <span>{title}</span>
          <div className="window-controls">
            <button onClick={() => onMinimize(id)}>{isMinimized ? '🔼' : '🔽'}</button>
            <button onClick={handleToggleFullscreen}>{isFullscreen ? '🗗' : '🗖'}</button>
            <button onClick={() => onClose(id)}>X</button>
          </div>
        </div>
        {!isMinimized && <div className="window-content">{children}</div>}
      </div>
    </Rnd>
  );
};

// ================= Taskbar Component =================
const Taskbar = ({ windows, onOpenWindow }) => {
  return (
    <div className="taskbar">
      <div className="taskbar-center">
        {windows.filter(w => w.isOpen).map(window => (
          <button key={window.id} onClick={() => onOpenWindow(window.id)}>
            {window.title}
          </button>
        ))}
      </div>
    </div>
  );
};

// ================= Desktop Icon Component =================
const DesktopIcon = ({ title, windowId, onOpen }) => (
  <div className="desktop-icon" onDoubleClick={() => onOpen(windowId)}>
    <div className="icon-image">🗂️</div>
    <div className="icon-title">{title}</div>
  </div>
);

// ================= File Explorer Component =================
const FileExplorer = ({ node }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (node.type === 'file') {
    return <div className="file">📄 {node.name}</div>;
  }

  return (
    <div className="folder">
      <div onClick={() => setIsOpen(!isOpen)} className="folder-title">
        📁 {node.name}
      </div>
      {isOpen && (
        <div className="folder-contents" style={{ paddingLeft: 20 }}>
          {node.children.map((child, index) => (
            <FileExplorer key={index} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

// ================= Main App Component =================
const App = () => {
  const [windows, setWindows] = useState([
    {
      id: 1,
      title: 'My Computer',
      content: {
        type: 'folder',
        name: 'Root',
        children: [
          { type: 'file', name: 'file1.txt' },
          { type: 'folder', name: 'Documents', children: [
            { type: 'file', name: 'doc1.txt' },
            { type: 'file', name: 'doc2.txt' }
          ]},
        ]
      },
      isOpen: true,
      isMinimized: false,
      isFullscreen: false
    },
    {
      id: 2,
      title: 'Notes',
      content: 'This is a simple notes window.',
      isOpen: false,
      isMinimized: false,
      isFullscreen: false
    }
  ]);

  const openWindow = (id) => {
    setWindows(windows.map(window => window.id === id ? { ...window, isOpen: true, isMinimized: false } : window));
  };

  const closeWindow = (id) => {
    setWindows(windows.map(window => window.id === id ? { ...window, isOpen: false } : window));
  };

  const minimizeWindow = (id) => {
    setWindows(windows.map(window => window.id === id ? { ...window, isMinimized: !window.isMinimized } : window));
  };

  const toggleFullscreenWindow = (id) => {
    setWindows(windows.map(window => window.id === id ? { ...window, isFullscreen: !window.isFullscreen } : window));
  };

  return (
    <div className="desktop">
      {/* Desktop icons */}
      {windows.map(window => (
        <DesktopIcon
          key={window.id}
          title={window.title}
          windowId={window.id}
          onOpen={openWindow}
        />
      ))}

      {/* Open windows */}
      {windows.filter(window => window.isOpen).map(window => (
        <Window
          key={window.id}
          id={window.id}
          title={window.title}
          isMinimized={window.isMinimized}
          isFullscreen={window.isFullscreen}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onToggleFullscreen={toggleFullscreenWindow}
        >
          {typeof window.content === 'string' ? window.content : <FileExplorer node={window.content} />}
        </Window>
      ))}

      {/* Taskbar */}
      <Taskbar windows={windows} onOpenWindow={openWindow} />
    </div>
  );
};

export default App;
