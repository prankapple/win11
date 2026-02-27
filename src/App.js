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

const Taskbar = ({ windows, onOpenWindow }) => (
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

const FileExplorer = ({ node, updateNode, path = [] }) => {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [editingContent, setEditingContent] = useState(false);
  const [contentValue, setContentValue] = useState(node.content || "");

  /* ===== FILE ===== */

  if (node.type === "file") {
    return (
      <div className="file">
        📄{" "}
        {editingName ? (
          <>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              onClick={() => {
                updateNode(path, (file) => ({
                  ...file,
                  name: newName,
                }));
                setEditingName(false);
              }}
            >
              Save
            </button>
          </>
        ) : (
          <>
            <span onDoubleClick={() => setEditingContent(true)}>
              {node.name}
            </span>
            <button onClick={() => setEditingName(true)}>✏</button>
            <button
              onClick={() => {
                const blob = new Blob(
                  [node.content || ""],
                  { type: "text/plain" }
                );
                saveAs(blob, node.name);
              }}
            >
              ⬇
            </button>
            <button
              onClick={() => updateNode(path, () => null)}
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
                updateNode(path, (file) => ({
                  ...file,
                  content: contentValue,
                }));
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

  /* ===== FOLDER ===== */

  return (
    <div className="folder">
      <div className="folder-title">
        📁 {node.name}
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "▼" : "▶"}
        </button>

        <button
          onClick={() =>
            updateNode(path, (folder) => ({
              ...folder,
              children: [
                ...folder.children,
                {
                  type: "file",
                  name: "newFile.txt",
                  content: "",
                },
              ],
            }))
          }
        >
          📄+
        </button>

        <button
          onClick={() =>
            updateNode(path, (folder) => ({
              ...folder,
              children: [
                ...folder.children,
                {
                  type: "folder",
                  name: "New Folder",
                  children: [],
                },
              ],
            }))
          }
        >
          📁+
        </button>

        <button
          onClick={async () => {
            const zip = new JSZip();

            const addToZip = (folder, zipFolder) => {
              folder.children.forEach((child) => {
                if (child.type === "file") {
                  zipFolder.file(
                    child.name,
                    child.content || ""
                  );
                } else {
                  const newFolder =
                    zipFolder.folder(child.name);
                  addToZip(child, newFolder);
                }
              });
            };

            addToZip(node, zip);
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
                      updateNode(path, (folder) => ({
                        ...folder,
                        children: [
                          ...folder.children,
                          {
                            type: "file",
                            name: relativePath,
                            content,
                          },
                        ],
                      }));
                    }
                  }
                );
              });
            } else {
              const reader = new FileReader();
              reader.onload = () => {
                updateNode(path, (folder) => ({
                  ...folder,
                  children: [
                    ...folder.children,
                    {
                      type: "file",
                      name: file.name,
                      content: reader.result,
                    },
                  ],
                }));
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
              path={[...path, "children", index]}
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

  const updateNode = (path, updater) => {
    const updateRecursive = (obj, currentPath = []) => {
      if (currentPath.length === path.length) {
        return updater(obj);
      }

      const key = path[currentPath.length];
      return {
        ...obj,
        [key]: updateRecursive(
          obj[key],
          [...currentPath, key]
        ),
      };
    };

    setWindows((prev) =>
      prev.map((w) =>
        typeof w.content === "string"
          ? w
          : {
              ...w,
              content: updateRecursive(w.content),
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
      {windows.map((w) => (
        <DesktopIcon
          key={w.id}
          title={w.title}
          windowId={w.id}
          onOpen={openWindow}
        />
      ))}

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
