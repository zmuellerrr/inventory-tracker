import React, { useState, useEffect } from "react";
import logo from "./Universal Logo.png";
import publisherBg from "./Baseline for inventory manager.png";

// 🔹 Reusable editable header
function EditableHeader({ title, setTitle, storageKey }) {
  const [isEditing, setIsEditing] = useState(false);

  // Load title from localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem(storageKey);
    if (savedTitle) setTitle(savedTitle);
  }, [storageKey, setTitle]);

  // Save whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, title);
  }, [title, storageKey]);

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

// 🔹 Shared inline-editable table cell
function EditableCell({ isEditing, value, onChange, finishEditing }) {
  return isEditing ? (
    <input
      type="text"
      autoFocus
      defaultValue={value}
      onBlur={(e) => {
        onChange(e.target.value.trim());
        finishEditing();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") e.target.blur();
      }}
      className="w-full p-2 border rounded bg-gray-900 text-[#DC143C]"
    />
  ) : (
    value || <span className="italic text-gray-500">—</span>
  );
}

// 🔹 Base Inventory Component
function BaseInventory({
  storageKey,
  inventory,
  setInventory,
  editingId,
  setEditingId,
  editingField,
  setEditingField,
  menuOpenId,
  setMenuOpenId,
  lastDeleted,
  setLastDeleted,
  undoTimeoutId,
  setUndoTimeoutId,
  title,
  setTitle,
  titleKey,
  fields,
  placeholders,
}) {
  const [formValues, setFormValues] = useState(
    Object.fromEntries(fields.map((f) => [f, ""]))
  );

  // Load inventory from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setInventory(JSON.parse(saved));
  }, [storageKey, setInventory]);

  // Save inventory whenever it changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(inventory));
  }, [inventory, storageKey]);

  const handleAddItem = (e) => {
    e.preventDefault();

    if (!formValues[fields[0]].trim() || !formValues[fields[1]].trim()) {
      alert(`${placeholders[0]} and ${placeholders[1]} are required`);
      return;
    }

    const newItem = {
      id: inventory.length ? inventory[inventory.length - 1].id + 1 : 1,
    };

    fields.forEach((field) => {
      if (field === "quantity") {
        const quantityNum = parseInt(formValues[field], 10);
        newItem[field] =
          isNaN(quantityNum) || quantityNum < 0 ? 0 : quantityNum;
      } else {
        newItem[field] = formValues[field].trim();
      }
    });

    setInventory([...inventory, newItem]);
    setFormValues(Object.fromEntries(fields.map((f) => [f, ""])));
  };

  const finishEditing = () => {
    setEditingId(null);
    setEditingField(null);
  };

  const updateItem = (id, field, value) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const deleteItem = (id) => {
    const itemToDelete = inventory.find((item) => item.id === id);
    if (!itemToDelete) return;

    setInventory((prev) => prev.filter((item) => item.id !== id));
    setLastDeleted(itemToDelete);

    if (undoTimeoutId) clearTimeout(undoTimeoutId);

    const timeoutId = setTimeout(() => {
      setLastDeleted(null);
      setUndoTimeoutId(null);
    }, 5000);

    setUndoTimeoutId(timeoutId);
    setMenuOpenId(null);
  };

  const undoDelete = () => {
    if (lastDeleted) {
      setInventory((prev) => [...prev, lastDeleted]);
      setLastDeleted(null);
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
      }
    }
  };

  const duplicateItem = (id) => {
    const index = inventory.findIndex((item) => item.id === id);
    if (index === -1) return;
    const original = inventory[index];
    const duplicated = {
      ...original,
      id: inventory.length ? inventory[inventory.length - 1].id + 1 : 1,
      [fields[0]]: original[fields[0]] + " (Copy)",
    };
    const newInventory = [
      ...inventory.slice(0, index + 1),
      duplicated,
      ...inventory.slice(index + 1),
    ];
    setInventory(newInventory);
    setMenuOpenId(null);
  };

  const copyItemToClipboard = (item) => {
    const text = fields.map((f) => `${f}: ${item[f]}`).join("\t");
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied: ${text}`);
    });
    setMenuOpenId(null);
  };

  return (
    <div className="p-6 bg-gray-900 bg-opacity-80 rounded border-4 border-[#DC143C] text-[#DC143C] shadow-lg max-w-full">
      <EditableHeader title={title} setTitle={setTitle} storageKey={titleKey} />

      <form
        onSubmit={handleAddItem}
        className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-5"
      >
        {fields.map((field, idx) => (
          <input
            key={field}
            type={field === "quantity" ? "number" : "text"}
            value={formValues[field]}
            onChange={(e) =>
              setFormValues({ ...formValues, [field]: e.target.value })
            }
            placeholder={placeholders[idx]}
            min={field === "quantity" ? "0" : undefined}
            className="p-3 border border-gray-600 rounded bg-gray-900 text-[#DC143C]"
            required={idx < 2}
          />
        ))}
        <button
          type="submit"
          className="font-semibold text-white bg-[#DC143C] rounded hover:bg-[#B0102C]"
        >
          Add Item
        </button>
      </form>

      <div className="overflow-x-auto rounded shadow-sm">
        <table className="min-w-full divide-y divide-gray-700 table-auto">
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
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-700">
                {fields.map((field) => (
                  <td
                    key={field}
                    className="px-6 py-4 whitespace-nowrap text-[#DC143C]"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingField(field);
                    }}
                  >
                    <EditableCell
                      isEditing={editingId === item.id && editingField === field}
                      value={item[field]}
                      onChange={(val) => updateItem(item.id, field, val)}
                      finishEditing={finishEditing}
                    />
                  </td>
                ))}
                <td className="relative px-4 py-4 text-center">
                  <button
                    onClick={() =>
                      setMenuOpenId(menuOpenId === item.id ? null : item.id)
                    }
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
            ))}
          </tbody>
        </table>
      </div>

      {lastDeleted && (
        <div className="flex items-center justify-between p-2 mt-4 bg-yellow-100 border rounded">
          <span>Deleted item.</span>
          <button
            className="px-3 py-1 text-white bg-blue-600 rounded"
            onClick={undoDelete}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(null);

  const [hardwareInventory, setHardwareInventory] = useState([]);
  const [materialInventory, setMaterialInventory] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);

  const [hardwareTitle, setHardwareTitle] = useState("Hardware Inventory");
  const [materialTitle, setMaterialTitle] = useState("Material Inventory");

  return (
    <div
      className="min-h-screen bg-center bg-cover"
      style={{
        backgroundImage: `url(${publisherBg})`,
      }}
    >
      <div className="min-h-screen p-8 bg-black bg-opacity-70">
        {!view ? (
          <div className="flex flex-col min-h-screen px-4">
            <header className="relative flex items-center justify-center py-8">
              <img
                src={logo}
                alt="Universal Logistics Logo"
                className="absolute object-contain w-auto h-20 top-4 left-4"
              />
              <h1 className="text-5xl font-extrabold text-[#DC143C] select-none text-center pl-28">
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
                storageKey="hardwareInventory"
                titleKey="hardwareTitle"
                inventory={hardwareInventory}
                setInventory={setHardwareInventory}
                editingId={editingId}
                setEditingId={setEditingId}
                editingField={editingField}
                setEditingField={setEditingField}
                menuOpenId={menuOpenId}
                setMenuOpenId={setMenuOpenId}
                lastDeleted={lastDeleted}
                setLastDeleted={setLastDeleted}
                undoTimeoutId={undoTimeoutId}
                setUndoTimeoutId={setUndoTimeoutId}
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
                storageKey="materialInventory"
                titleKey="materialTitle"
                inventory={materialInventory}
                setInventory={setMaterialInventory}
                editingId={editingId}
                setEditingId={setEditingId}
                editingField={editingField}
                setEditingField={setEditingField}
                menuOpenId={menuOpenId}
                setMenuOpenId={setMenuOpenId}
                lastDeleted={lastDeleted}
                setLastDeleted={setLastDeleted}
                undoTimeoutId={undoTimeoutId}
                setUndoTimeoutId={setUndoTimeoutId}
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