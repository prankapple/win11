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

  if (!isMinimized && !isFullscreen) {
    // keep current size
  }

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
          <div>
            <button onClick={() => onMinimize(id)}>
              {isMinimized ? "🔼" : "🔽"}
            </button>
            <button onClick={toggleFullscreen}>
              {isFullscreen ? "🗗" : "🗖"}
            </button>
            <button onClick={() => onClose(id)}>X</button>
          </div>
        </div>
        {!isMinimized && <div className="window-content">{children}</div>}
      </div>
    </Rnd>
  );
};

/* ================= FILE EXPLORER ================= */

const FileExplorer = ({ node, updateNode }) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [editingContent, setEditingContent] = useState(false);
  const [contentValue, setContentValue] = useState(node.content || "");

  const downloadFile = () => {
    const blob = new Blob([node.content || ""], { type: "text/plain" });
    saveAs(blob, node.name);
  };

  const deleteNode = () => updateNode("delete", node);

  const renameNode = () => {
    updateNode("rename", node, newName);
    setEditing(false);
  };

  const saveContent = () => {
    updateNode("editContent", node, contentValue);
    setEditingContent(false);
  };

  const createFile = () =>
    updateNode("createFile", node, {
      type: "file",
      name: "newFile.txt",
      content: "",
    });

  const createFolder = () =>
    updateNode("createFolder", node, {
      type: "folder",
      name: "New Folder",
      children: [],
    });

  const zipFolder = async () => {
    const zip = new JSZip();

    const addToZip = (folder, path = "") => {
      folder.children.forEach((child) => {
        if (child.type === "file") {
          zip.file(path + child.name, child.content || "");
        } else {
          addToZip(child, path + child.name + "/");
        }
      });
    };

    addToZip(node);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, node.name + ".zip");
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith(".zip")) {
      JSZip.loadAsync(file).then((zip) => {
        zip.forEach(async (relativePath, zipEntry) => {
          if (!zipEntry.dir) {
            const content = await zipEntry.async("string");
            updateNode("createFile", node, {
              type: "file",
              name: relativePath,
              content,
            });
          }
        });
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
  };

  /* FILE */
  if (node.type === "file") {
    return (
      <div className="file">
        📄{" "}
        {editing ? (
          <>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button onClick={renameNode}>Save</button>
          </>
        ) : (
          <>
            <span onDoubleClick={() => setEditingContent(true)}>
              {node.name}
            </span>
            <button onClick={() => setEditing(true)}>✏</button>
            <button onClick={downloadFile}>⬇</button>
            <button onClick={deleteNode}>🗑</button>
          </>
        )}

        {editingContent && (
          <div>
            <textarea
              value={contentValue}
              onChange={(e) => setContentValue(e.target.value)}
            />
            <button onClick={saveContent}>Save</button>
          </div>
        )}
      </div>
    );
  }

  /* FOLDER */
  return (
    <div className="folder">
      <div>
        📁 {node.name}
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "▼" : "▶"}
        </button>
        <button onClick={createFile}>📄+</button>
        <button onClick={createFolder}>📁+</button>
        <button onClick={zipFolder}>🗜</button>
        <button onClick={deleteNode}>🗑</button>
        <input type="file" onChange={handleUpload} />
      </div>

      {expanded && (
        <div style={{ paddingLeft: 20 }}>
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
            node.children.push(payload);
            return node;
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
      prev.map((w) => ({
        ...w,
        content: recursiveUpdate({ ...w.content }),
      }))
    );
  };

  const openWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isOpen: true, isMinimized: false } : w
      )
    );

  const closeWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isOpen: false } : w))
    );

  const minimizeWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
      )
    );

  const toggleFullscreenWindow = (id) =>
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isFullscreen: !w.isFullscreen } : w
      )
    );

  return (
    <div className="desktop">
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
            onToggleFullscreen={toggleFullscreenWindow}
          >
            <FileExplorer
              node={window.content}
              updateNode={updateNode}
            />
          </Window>
        ))}
    </div>
  );
};

export default App;
