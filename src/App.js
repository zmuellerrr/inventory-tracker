import React, { useState, useEffect } from "react";
import logo from "./Universal Logo.png";
import publisherBg from "./Baseline for inventory manager.png";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// 🔹 Editable Header
function EditableHeader({ title, setTitle, docId }) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedLocal = localStorage.getItem(docId);
    if (savedLocal) setTitle(savedLocal);

    const loadFirestore = async () => {
      try {
        const docRef = doc(db, "titles", docId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setTitle(snap.data().title);
          localStorage.setItem(docId, snap.data().title);
        }
      } catch {
        console.warn("Firestore unavailable, using localStorage only");
      }
    };
    loadFirestore();
  }, [docId, setTitle]);

  useEffect(() => {
    if (title) {
      localStorage.setItem(docId, title);
      try {
        setDoc(doc(db, "titles", docId), { title });
      } catch {
        console.warn("Firestore save failed, kept in localStorage");
      }
    }
  }, [title, docId]);

  return (
    <div className="mb-6 text-3xl font-bold text-center">
      {isEditing ? (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") setIsEditing(false);
          }}
          autoFocus
          className="w-full max-w-lg p-2 border rounded bg-gray-900 text-[#DC143C] text-center"
        />
      ) : (
        <h2
          className="cursor-pointer hover:underline"
          onClick={() => setIsEditing(true)}
        >
          {title}
        </h2>
      )}
    </div>
  );
}

// 🔹 Editable Cell with dropdown suggestions
function EditableCell({ isEditing, value, onChange, finishEditing, field, suggestions }) {
  const [inputValue, setInputValue] = useState(value || "");

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  if (!isEditing) {
    return value || <span className="italic text-gray-500">—</span>;
  }

  if (field === "quantity") {
    // Quantity remains a number input, no dropdown
    return (
      <input
        type="number"
        autoFocus
        value={inputValue}
        min="0"
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => {
          onChange(inputValue.trim());
          finishEditing();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") e.target.blur();
        }}
        className="w-full p-2 border rounded bg-gray-900 text-[#DC143C]"
      />
    );
  }

  return (
    <input
      type="text"
      autoFocus
      list={`suggestions-${field}`}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={() => {
        onChange(inputValue.trim());
        finishEditing();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") e.target.blur();
      }}
      className="w-full p-2 border rounded bg-gray-900 text-[#DC143C]"
      autoComplete="off"
    />
  );
}

// 🔹 BaseInventory Component
function BaseInventory({
  collectionName,
  inventory,
  setInventory,
  title,
  setTitle,
  titleId,
  fields,
  placeholders,
}) {
  const [formValues, setFormValues] = useState(
    Object.fromEntries(fields.map((f) => [f, ""]))
  );
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const [lastAction, setLastAction] = useState(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);

  // Sorting state
  const [sortByLocation, setSortByLocation] = useState(false);

  // Load from Firestore + localStorage with ordering
  useEffect(() => {
    const localData = localStorage.getItem(collectionName);
    if (localData) setInventory(JSON.parse(localData));

    const q = query(collection(db, collectionName), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          if (d.order === undefined) d.order = Date.now(); // fallback
          return { id: doc.id, ...d };
        });
        setInventory(data);
        localStorage.setItem(collectionName, JSON.stringify(data));
      },
      () => console.warn("Firestore offline, using localStorage only")
    );
    return () => unsub();
  }, [collectionName, setInventory]);

  // Suggestions for dropdowns by field (from existing inventory, unique, sorted)
  const suggestionsForField = (field) => {
    if (field === "quantity") return [];
    const values = inventory.map((item) => item[field]).filter(Boolean);
    return Array.from(new Set(values)).sort();
  };

  // Handle adding new item, with order assigned at the end
  const handleAddItem = async (e) => {
    e.preventDefault();

    if (!formValues[fields[0]].trim() || !formValues[fields[1]].trim()) {
      alert(`${placeholders[0]} and ${placeholders[1]} are required`);
      return;
    }

    const newItem = {};
    fields.forEach((field) => {
      if (field === "quantity") {
        const quantityNum = parseInt(formValues[field], 10);
        newItem[field] =
          isNaN(quantityNum) || quantityNum < 0 ? 0 : quantityNum;
      } else {
        newItem[field] = formValues[field].trim();
      }
    });

    // Assign order at the end of the list
    const maxOrder = inventory.length
      ? Math.max(...inventory.map((i) => i.order || 0))
      : 0;
    newItem.order = maxOrder + 1;

    try {
      await addDoc(collection(db, collectionName), newItem);
    } catch {
      const local = [...inventory, { id: Date.now().toString(), ...newItem }];
      setInventory(local);
      localStorage.setItem(collectionName, JSON.stringify(local));
    }

    setFormValues(Object.fromEntries(fields.map((f) => [f, ""])));
  };

  const finishEditing = () => {
    setEditingId(null);
    setEditingField(null);
  };

  const updateItem = async (id, field, value) => {
    try {
      await updateDoc(doc(db, collectionName, id), { [field]: value });
    } catch {
      const updated = inventory.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      );
      setInventory(updated);
      localStorage.setItem(collectionName, JSON.stringify(updated));
    }
  };

  // Update order in Firestore/localStorage
  const updateOrder = async (newInventory) => {
    try {
      await Promise.all(
        newInventory.map((item, index) =>
          updateDoc(doc(db, collectionName, item.id), { order: index })
        )
      );
    } catch {
      setInventory(newInventory);
      localStorage.setItem(collectionName, JSON.stringify(newInventory));
    }
  };

  // Drag end handler
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(inventory);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setInventory(items);
    updateOrder(items);
  };

  const triggerUndo = (action) => {
    setLastAction(action);
    if (undoTimeoutId) clearTimeout(undoTimeoutId);
    const timeoutId = setTimeout(() => {
      setLastAction(null);
      setUndoTimeoutId(null);
    }, 5000);
    setUndoTimeoutId(timeoutId);
  };

  const deleteItem = async (id) => {
    const itemToDelete = inventory.find((item) => item.id === id);
    if (!itemToDelete) return;

    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch {
      const updated = inventory.filter((item) => item.id !== id);
      setInventory(updated);
      localStorage.setItem(collectionName, JSON.stringify(updated));
    }

    triggerUndo({ type: "delete", item: itemToDelete });
    setMenuOpenId(null);
  };

  const duplicateItem = async (id) => {
    const original = inventory.find((item) => item.id === id);
    if (!original) return;
    const duplicated = {
      ...original,
      id: undefined,
      [fields[0]]: original[fields[0]] + " (Copy)",
      order: (Math.max(...inventory.map((i) => i.order || 0)) || 0) + 1,
    };

    let newDoc;
    try {
      newDoc = await addDoc(collection(db, collectionName), duplicated);
    } catch {
      duplicated.id = Date.now().toString();
      const local = [...inventory, duplicated];
      setInventory(local);
      localStorage.setItem(collectionName, JSON.stringify(local));
      newDoc = { id: duplicated.id };
    }

    triggerUndo({ type: "duplicate", item: { ...duplicated, id: newDoc.id } });
    setMenuOpenId(null);
  };

  const copyItemToClipboard = (item) => {
    const text = fields.map((f) => `${f}: ${item[f]}`).join("\t");
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied: ${text}`);
    });
    triggerUndo({ type: "copy", item });
    setMenuOpenId(null);
  };

  const undoAction = async () => {
    if (!lastAction) return;

    if (lastAction.type === "delete") {
      const copy = { ...lastAction.item };
      delete copy.id;
      try {
        await addDoc(collection(db, collectionName), copy);
      } catch {
        const restored = [...inventory, copy];
        setInventory(restored);
        localStorage.setItem(collectionName, JSON.stringify(restored));
      }
    } else if (lastAction.type === "duplicate") {
      try {
        await deleteDoc(doc(db, collectionName, lastAction.item.id));
      } catch {
        const filtered = inventory.filter((i) => i.id !== lastAction.item.id);
        setInventory(filtered);
        localStorage.setItem(collectionName, JSON.stringify(filtered));
      }
    } else if (lastAction.type === "copy") {
      alert("Clipboard copy undone (data cleared).");
      navigator.clipboard.writeText("");
    }

    setLastAction(null);
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
  };

  // Sort inventory by location or manual order
  const sortedInventory = React.useMemo(() => {
    if (sortByLocation) {
      return [...inventory].sort((a, b) => {
        if (!a.location) return 1;
        if (!b.location) return -1;
        return a.location.localeCompare(b.location);
      });
    }
    // else manual order is the current inventory order by 'order' property
    return inventory;
  }, [inventory, sortByLocation]);

  return (
    <div className="p-6 bg-gray-900 bg-opacity-80 rounded border-4 border-[#DC143C] text-[#DC143C] shadow-lg max-w-full">
      <EditableHeader title={title} setTitle={setTitle} docId={titleId} />

      {/* Add item form */}
      <form
        onSubmit={handleAddItem}
        className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-5"
      >
        {fields.map((field, idx) => (
          <div key={field}>
            <input
              type={field === "quantity" ? "number" : "text"}
              list={field !== "quantity" ? `suggestions-${field}` : undefined}
              value={formValues[field]}
              onChange={(e) =>
                setFormValues({ ...formValues, [field]: e.target.value })
              }
              placeholder={placeholders[idx]}
              min={field === "quantity" ? "0" : undefined}
              className="p-3 border border-gray-600 rounded bg-gray-900 text-[#DC143C]"
              required={idx < 2}
              autoComplete="off"
            />
            {field !== "quantity" && (
              <datalist id={`suggestions-${field}`}>
                {suggestionsForField(field).map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            )}
          </div>
        ))}
        <button
          type="submit"
          className="font-semibold text-white bg-[#DC143C] rounded hover:bg-[#B0102C]"
        >
          Add Item
        </button>
      </form>

      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={sortByLocation}
            onChange={() => setSortByLocation(!sortByLocation)}
            className="cursor-pointer"
          />
          <span>Sort by Location</span>
        </label>
        <button
          onClick={() => setSortByLocation(false)}
          className="px-3 py-1 text-sm font-semibold bg-[#DC143C] rounded hover:bg-[#B0102C]"
        >
          Manual Order
        </button>
      </div>

      <div className="overflow-x-auto rounded shadow-sm">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="inventoryList" isDropDisabled={sortByLocation}>
            {(provided) => (
              <table
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="min-w-full divide-y divide-gray-700 table-auto"
              >
                <thead className="bg-gray-900">
                  <tr>
                    {placeholders.concat("Options").map((header, i) => (
                      <th
                        key={i}
                        className="px-6 py-3 text-xs font-medium tracking-wider text-left text-[#DC143C] uppercase"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700">
                  {sortedInventory.map((item, index) => {
                    const isEditingThis =
                      editingId === item.id && editingField !== null;
                    return (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                        isDragDisabled={sortByLocation}
                      >
                        {(providedDraggable) => (
                          <tr
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            className="cursor-pointer hover:bg-gray-700"
                            onClick={() => {
                              if (!isEditingThis) {
                                setEditingId(item.id);
                                setEditingField(fields[0]);
                              }
                            }}
                          >
                            {fields.map((field) => (
                              <td
                                key={field}
                                className="px-6 py-4 whitespace-nowrap text-[#DC143C]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(item.id);
                                  setEditingField(field);
                                }}
                              >
                                <EditableCell
                                  isEditing={
                                    editingId === item.id && editingField === field
                                  }
                                  value={item[field]}
                                  onChange={(val) => updateItem(item.id, field, val)}
                                  finishEditing={finishEditing}
                                  field={field}
                                  suggestions={suggestionsForField(field)}
                                />
                              </td>
                            ))}
                            <td className="relative px-4 py-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(menuOpenId === item.id ? null : item.id);
                                }}
                                className="text-2xl font-bold text-[#DC143C]"
                              >
                                ⋮
                              </button>
                              {menuOpenId === item.id && (
                                <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-[#DC143C] rounded shadow-md z-20 min-w-[140px]">
                                  <button
                                    onClick={() => duplicateItem(item.id)}
                                    className="w-full px-4 py-2 text-left hover:bg-[#B0102C]"
                                  >
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={() => deleteItem(item.id)}
                                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => copyItemToClipboard(item)}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-700"
                                  >
                                    Copy
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </tbody>
              </table>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Undo Notification */}
      {lastAction && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 border-2 border-[#DC143C] rounded p-4 flex items-center space-x-4 z-50 max-w-xl">
          <span>Undo {lastAction.type}?</span>
          <button
            onClick={undoAction}
            className="font-semibold text-[#DC143C] hover:underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

// 🔹 Main App with menu and two inventories
export default function App() {
  const [view, setView] = useState(null);

  const [hardwareInventory, setHardwareInventory] = useState([]);
  const [materialInventory, setMaterialInventory] = useState([]);

  const [hardwareTitle, setHardwareTitle] = useState("Hardware Inventory");
  const [materialTitle, setMaterialTitle] = useState("Material Inventory");

  return (
    <div
      className="min-h-screen bg-center bg-cover"
      style={{
        backgroundImage: `url(${publisherBg})`,
      }}
    >
      <div className="min-h-screen p-8 bg-black bg-opacity-70 text-[#DC143C]">
        {!view ? (
          <div className="flex flex-col min-h-screen px-4">
            <header className="relative flex items-center justify-center py-8">
              <img
                src={logo}
                alt="Universal Logistics Logo"
                className="absolute object-contain w-auto h-20 top-4 left-4"
              />
              <h1 className="text-5xl font-extrabold text-center select-none pl-28">
                Universal Logistics' IT Network Inventory
              </h1>
            </header>

            <div className="flex flex-col items-center space-y-12">
              <button
                onClick={() => setView("hardware")}
                className="w-72 py-5 text-2xl font-semibold text-white bg-[#2F2F2F] border-4 border-[#DC143C] rounded-lg hover:bg-[#444444]"
              >
                {hardwareTitle}
              </button>
              <button
                onClick={() => setView("material")}
                className="w-72 py-5 text-2xl font-semibold text-white bg-[#2F2F2F] border-4 border-[#DC143C] rounded-lg hover:bg-[#444444]"
              >
                {materialTitle}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setView(null)}
              className="mb-6 text-[#DC143C] hover:underline focus:outline-none"
            >
              ← Back to main menu
            </button>

            {view === "hardware" ? (
              <BaseInventory
                collectionName="hardwareInventory"
                titleId="hardwareTitle"
                inventory={hardwareInventory}
                setInventory={setHardwareInventory}
                title={hardwareTitle}
                setTitle={setHardwareTitle}
                fields={["model", "serial", "mac", "location"]}
                placeholders={[
                  "Model Number *",
                  "Serial Number *",
                  "MAC Address",
                  "Location",
                ]}
              />
            ) : (
              <BaseInventory
                collectionName="materialInventory"
                titleId="materialTitle"
                inventory={materialInventory}
                setInventory={setMaterialInventory}
                title={materialTitle}
                setTitle={setMaterialTitle}
                fields={["item", "partNumber", "quantity", "location"]}
                placeholders={[
                  "Item Name *",
                  "Part Number *",
                  "Quantity",
                  "Location",
                ]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}