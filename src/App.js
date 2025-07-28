import React, { useState } from "react";

function HardwareInventory({
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
}) {
  // Add hardware item
  const [newModel, setNewModel] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newMac, setNewMac] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newModel.trim() || !newSerial.trim()) {
      alert("Model and Serial Number are required");
      return;
    }
    const newItem = {
      id: inventory.length ? inventory[inventory.length - 1].id + 1 : 1,
      model: newModel.trim(),
      serial: newSerial.trim(),
      mac: newMac.trim(),
      location: newLocation.trim(),
    };
    setInventory([...inventory, newItem]);
    setNewModel("");
    setNewSerial("");
    setNewMac("");
    setNewLocation("");
  };

  const startEditing = (id, field) => {
    setEditingId(id);
    setEditingField(field);
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
      model: original.model + " (Copy)",
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
    const text = `Model: ${item.model}\tSerial: ${item.serial}\tMAC: ${item.mac}\tLocation: ${item.location}`;
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied: ${text}`);
    });
    setMenuOpenId(null);
  };

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold text-center text-blue-900">
        Hardware Inventory
      </h2>

      <form
        onSubmit={handleAddItem}
        className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-5"
        aria-label="Add new hardware item"
      >
        <input
          type="text"
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
          placeholder="Model Number *"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="text"
          value={newSerial}
          onChange={(e) => setNewSerial(e.target.value)}
          placeholder="Serial Number *"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
          required
        />
        <input
          type="text"
          value={newMac}
          onChange={(e) => setNewMac(e.target.value)}
          placeholder="MAC Address"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <input
          type="text"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder="Location"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <button
          type="submit"
          className="font-semibold text-white transition-colors bg-blue-600 rounded hover:bg-blue-700"
        >
          Add Item
        </button>
      </form>

      <div className="overflow-x-auto border border-gray-300 rounded shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-blue-700 uppercase">
                Model Number
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-blue-700 uppercase">
                Serial Number
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-blue-700 uppercase">
                MAC Address
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-blue-700 uppercase">
                Location
              </th>
              <th className="relative w-24 px-6 py-3">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventory.map((item) => (
              <tr
                key={item.id}
                className="transition-colors cursor-pointer hover:bg-blue-50"
              >
                {["model", "serial", "mac", "location"].map((field) => (
                  <td
                    key={field}
                    className="px-6 py-4 whitespace-nowrap"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingField(field);
                    }}
                  >
                    {editingId === item.id && editingField === field ? (
                      <input
                        type="text"
                        autoFocus
                        defaultValue={item[field]}
                        onBlur={(e) => {
                          updateItem(item.id, field, e.target.value.trim());
                          finishEditing();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            e.target.blur();
                          }
                        }}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      item[field] || <span className="italic text-gray-400">—</span>
                    )}
                  </td>
                ))}
                <td className="relative px-4 py-4 text-center">
                  <button
                    onClick={() =>
                      setMenuOpenId(menuOpenId === item.id ? null : item.id)
                    }
                    aria-label="Open options menu"
                    className="text-2xl font-bold text-gray-600 transition hover:text-blue-600"
                  >
                    ⋮
                  </button>
                  {menuOpenId === item.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-md z-20 min-w-[140px]">
                      <button
                        onClick={() => duplicateItem(item.id)}
                        className="w-full px-4 py-2 text-left transition hover:bg-blue-100"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="w-full px-4 py-2 text-left text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => copyItemToClipboard(item)}
                        className="w-full px-4 py-2 text-left transition hover:bg-gray-100"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {inventory.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="py-8 italic text-center text-gray-500"
                >
                  No items found. Add new items above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lastDeleted && (
        <div className="fixed flex items-center gap-4 px-6 py-3 text-black -translate-x-1/2 bg-yellow-300 rounded shadow-lg bottom-4 left-1/2">
          <span>Item "{lastDeleted.model}" deleted.</span>
          <button
            onClick={() => {
              undoDelete();
            }}
            className="px-3 py-1 text-yellow-300 bg-black rounded hover:bg-gray-800"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function MaterialInventory({
  materialInventory,
  setMaterialInventory,
}) {
  const [newItem, setNewItem] = useState("");
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const handleAddMaterial = (e) => {
    e.preventDefault();
    if (!newItem.trim() || !newPartNumber.trim()) {
      alert("Item name and Part number are required");
      return;
    }
    const quantityNum = parseInt(newQuantity, 10);
    if (isNaN(quantityNum) || quantityNum < 0) {
      alert("Quantity must be a non-negative number");
      return;
    }
    const newMatItem = {
      id: materialInventory.length ? materialInventory[materialInventory.length - 1].id + 1 : 1,
      item: newItem.trim(),
      partNumber: newPartNumber.trim(),
      quantity: quantityNum,
      location: newLocation.trim(),
    };
    setMaterialInventory([...materialInventory, newMatItem]);
    setNewItem("");
    setNewPartNumber("");
    setNewQuantity("");
    setNewLocation("");
  };

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold text-center text-green-900">
        Material Inventory
      </h2>

      <form
        onSubmit={handleAddMaterial}
        className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-5"
        aria-label="Add new material item"
      >
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Item Name *"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-400 focus:outline-none"
          required
        />
        <input
          type="text"
          value={newPartNumber}
          onChange={(e) => setNewPartNumber(e.target.value)}
          placeholder="Part Number *"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-400 focus:outline-none"
          required
        />
        <input
          type="number"
          value={newQuantity}
          onChange={(e) => setNewQuantity(e.target.value)}
          placeholder="Quantity"
          min="0"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-400 focus:outline-none"
        />
        <input
          type="text"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder="Location"
          className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-400 focus:outline-none"
        />
        <button
          type="submit"
          className="font-semibold text-white transition-colors bg-green-600 rounded hover:bg-green-700"
        >
          Add Item
        </button>
      </form>

      <div className="overflow-x-auto border border-gray-300 rounded shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-green-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-green-700 uppercase">
                Item Name
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-green-700 uppercase">
                Part Number
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-green-700 uppercase">
                Quantity
              </th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-green-700 uppercase">
                Location
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materialInventory.map((item) => (
              <tr key={item.id} className="hover:bg-green-50">
                <td className="px-6 py-4 whitespace-nowrap">{item.item}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.partNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.location}</td>
              </tr>
            ))}
            {materialInventory.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="py-8 italic text-center text-gray-500"
                >
                  No items found. Add new items above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(null); // null = start screen
  const [hardwareInventory, setHardwareInventory] = useState([
    { id: 1, model: "MDL-1000", serial: "SN123456", mac: "00:1A:2B:3C:4D:5E", location: "Warehouse A" },
    { id: 2, model: "MDL-2000", serial: "SN654321", mac: "11:22:33:44:55:66", location: "Warehouse B" },
  ]);
  const [materialInventory, setMaterialInventory] = useState([
    { id: 1, item: "Nuts", partNumber: "P-123", quantity: 200, location: "Warehouse A" },
    { id: 2, item: "Bolts", partNumber: "P-456", quantity: 500, location: "Warehouse C" },
  ]);

  // Shared states for Hardware Inventory editing/menu
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Undo for hardware inventory
  const [lastDeleted, setLastDeleted] = useState(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState(null);

  if (!view) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-br from-blue-50 to-white">
        <h1 className="mb-8 text-5xl font-extrabold text-blue-900 select-none">
          Inventory Manager
        </h1>
        <div className="space-y-6">
          <button
            onClick={() => setView("hardware")}
            className="w-64 py-4 text-xl font-semibold text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Hardware Inventory
          </button>
          <button
            onClick={() => setView("material")}
            className="w-64 py-4 text-xl font-semibold text-white transition bg-green-600 rounded-lg hover:bg-green-700"
          >
            Material Inventory
          </button>
        </div>
      </div>
    );
  }

   return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-white">
      <button
        onClick={() => setView(null)}
        className="mb-6 text-blue-700 hover:underline focus:outline-none"
      >
        ← Back to main menu
      </button>

      {view === "hardware" ? (
        <HardwareInventory
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
        />
      ) : (
        <MaterialInventory
          materialInventory={materialInventory}
          setMaterialInventory={setMaterialInventory}
        />
      )}
    </div>
  );
}