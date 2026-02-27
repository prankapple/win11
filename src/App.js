import React, { useState } from "react";
import { Rnd } from "react-rnd";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./App.css";

/* ================= WINDOW ================= */

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
  const defaultSize = { width: 500, height: 400 };
  const fullscreenSize = { width: "100%", height: "100%" };

  const [size, setSize] = useState(defaultSize);
  const [position, setPosition] = useState({ x: 100, y: 50 });

  const toggleFullscreen = () => {
    if (isFullscreen) {
      setSize(defaultSize);
      setPosition({ x: 100, y: 50 });
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
      bounds="parent"
      onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        setSize({ width: ref.style.width, height: ref.style.height });
        setPosition(position);
      }}
      enableResizing={!isFullscreen && !isMinimized}
      disableDragging={isFullscreen || isMinimized}
      dragHandleClassName="window-header"
      className={`window ${isFullscreen ? "fullscreen" : ""}`}
    >
      <div>
        <div className="window-header">
          <span>{title}</span>
          <div className="window-controls">
            <button onClick={() => onMinimize(id)}>
              {isMinimized ? "🔼" : "🔽"}
            </button>
            <button onClick={toggleFullscreen}>
              {isFullscreen ? "🗗" : "🗖"}
            </button>
            <button onClick={() => onClose(id)}>X</button>
          </div>
        </div>
        {!isMinimized && (
          <div className="window-content">{children}</div>
        )}
      </div>
    </Rnd>
  );
};

/* ================= TASKBAR ================= */

const Taskbar = ({ windows, onOpenWindow }) => {
  return (
    <div className="taskbar">
      <div className="taskbar-center">
        {windows
          .filter((w) => w.isOpen)
          .map((w) => (
            <button key={w.id} onClick={() => onOpenWindow(w.id)}>
              {w.title}
            </button>
          ))}
      </div>
    </div>
  );
};

/* ================= DESKTOP ICON ================= */

const DesktopIcon = ({ title, windowId, onOpen }) => (
  <div
    className="desktop-icon"
    onDoubleClick={() => onOpen(windowId)}
  >
    <div className="icon-image">🗂️</div>
    <div className="icon-title">{title}</div>
  </div>
);

/* ================= FILE EXPLORER ================= */

const FileExplorer = ({ node, updateNode }) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [editingContent, setEditingContent] = useState(false);
  const [contentValue, setContentValue] = useState(node.content || "");

  if (node.type === "file") {
    const downloadFile = () => {
      const blob = new Blob([node.content || ""], {
        type: "text/plain",
      });
      saveAs(blob, node.name);
    };

    return (
      <div className="file">
        📄{" "}
        {editing ? (
          <>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              onClick={() => {
                updateNode("rename", node, newName);
                setEditing(false);
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <span
              onDoubleClick={() => setEditingContent(true)}
            >
              {node.name}
            </span>
            <button onClick={() => setEditing(true)}>✏</button>
            <button onClick={downloadFile}>⬇</button>
            <button
              onClick={() => updateNode("delete", node)}
            >
              🗑
            </button>
          </>
        )}

        {editingContent && (
          <div>
            <textarea
              value={contentValue}
              onChange={(e) =>
                setContentValue(e.target.value)
              }
            />
            <button
              onClick={() => {
                updateNode(
                  "editContent",
                  node,
                  contentValue
                );
                setEditingContent(false);
              }}
            >
              Save
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="folder">
      <div className="folder-title">
        📁 {node.name}
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "▼" : "▶"}
        </button>
        <button
          onClick={() =>
            updateNode("createFile", node, {
              type: "file",
              name: "newFile.txt",
              content: "",
            })
          }
        >
          📄+
        </button>
        <button
          onClick={() =>
            updateNode("createFolder", node, {
              type: "folder",
              name: "New Folder",
              children: [],
            })
          }
        >
          📁+
        </button>
        <button
          onClick={async () => {
            const zip = new JSZip();

            const addToZip = (folder, path = "") => {
              folder.children.forEach((child) => {
                if (child.type === "file") {
                  zip.file(
                    path + child.name,
                    child.content || ""
                  );
                } else {
                  addToZip(
                    child,
                    path + child.name + "/"
                  );
                }
              });
            };

            addToZip(node);
            const blob =
              await zip.generateAsync({ type: "blob" });
            saveAs(blob, node.name + ".zip");
          }}
        >
          🗜
        </button>

        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.name.endsWith(".zip")) {
              JSZip.loadAsync(file).then((zip) => {
                zip.forEach(
                  async (relativePath, zipEntry) => {
                    if (!zipEntry.dir) {
                      const content =
                        await zipEntry.async("string");
                      updateNode("createFile", node, {
                        type: "file",
                        name: relativePath,
                        content,
                      });
                    }
                  }
                );
              });
            } else {
              const reader = new FileReader();
              reader.onload = () => {
                updateNode("createFile", node, {
                  type: "file",
                  name: file.name,
                  content: reader.result,
                });
              };
              reader.readAsText(file);
            }
          }}
        />
      </div>

      {expanded && (
        <div className="folder-contents">
          {node.children?.map((child, index) => (
            <FileExplorer
              key={index}
              node={child}
              updateNode={updateNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ================= MAIN APP ================= */

const App = () => {
  const [windows, setWindows] = useState([
    {
      id: 1,
      title: "My Computer",
      content: {
        type: "folder",
        name: "Root",
        children: [],
      },
      isOpen: true,
      isMinimized: false,
      isFullscreen: false,
    },
    {
      id: 2,
      title: "Notes",
      content: "This is a simple notes window.",
      isOpen: false,
      isMinimized: false,
      isFullscreen: false,
    },
  ]);

  const updateNode = (action, targetNode, payload) => {
    const recursiveUpdate = (node) => {
      if (node === targetNode) {
        switch (action) {
          case "delete":
            return null;
          case "rename":
            node.name = payload;
            return node;
          case "editContent":
            node.content = payload;
            return node;
          case "createFile":
          case "createFolder":
            node.children.push(payload);
            return node;
          default:
            return node;
        }
      }

      if (node.children) {
        node.children = node.children
          .map(recursiveUpdate)
          .filter(Boolean);
      }

      return node;
    };

    setWindows((prev) =>
      prev.map((w) =>
        typeof w.content === "string"
          ? w
          : {
              ...w,
              content: recursiveUpdate({
                ...w.content,
              }),
            }
      )
    );
  };

  const openWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, isOpen: true, isMinimized: false }
          : w
      )
    );

  const closeWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isOpen: false } : w
      )
    );

  const minimizeWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, isMinimized: !w.isMinimized }
          : w
      )
    );

  const toggleFullscreenWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, isFullscreen: !w.isFullscreen }
          : w
      )
    );

  return (
    <div className="desktop">
      {/* Desktop Icons */}
      {windows.map((w) => (
        <DesktopIcon
          key={w.id}
          title={w.title}
          windowId={w.id}
          onOpen={openWindow}
        />
      ))}

      {/* Open Windows */}
      {windows
        .filter((w) => w.isOpen)
        .map((window) => (
          <Window
            key={window.id}
            id={window.id}
            title={window.title}
            isMinimized={window.isMinimized}
            isFullscreen={window.isFullscreen}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onToggleFullscreen={
              toggleFullscreenWindow
            }
          >
            {typeof window.content === "string" ? (
              window.content
            ) : (
              <FileExplorer
                node={window.content}
                updateNode={updateNode}
              />
            )}
          </Window>
        ))}

      <Taskbar
        windows={windows}
        onOpenWindow={openWindow}
      />
    </div>
  );
};

export default App;
