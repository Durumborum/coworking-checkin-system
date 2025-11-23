import UserForm from "./ui/UserForm";
import { useState } from "react";
import { API_BASE_URL } from "../config";

export default function Users({ users, loadUsers }) {
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", card_id: "", included_hours: 0 });

  const addUser = async () => {
    if (!newUser.name || !newUser.card_id) return alert("Name and Card ID required");
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || "Failed to add user");
      }
      setNewUser({ name: "", email: "", card_id: "", included_hours: 0 });
      loadUsers();
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const updateUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser)
      });
      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || "Failed to update user");
      }
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${id}`, { method: "DELETE" });
      if (res.ok) loadUsers();
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded shadow">
        <h2 className="font-bold mb-2">Add New User</h2>
        <UserForm
          user={newUser}
          setUser={setNewUser}
          onSave={addUser}
          onCancel={() => setNewUser({ name: "", email: "", card_id: "", included_hours: 0 })}
        />
      </div>

      <div className="p-4 border rounded shadow">
        <h2 className="font-bold mb-2">Registered Users</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">Card ID</th>
              <th className="border px-2 py-1">Included Hours</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                {editingUser?.id === u.id ? (
                  <td colSpan={5}>
                    <UserForm user={editingUser} setUser={setEditingUser} onSave={updateUser} onCancel={() => setEditingUser(null)} />
                  </td>
                ) : (
                  <>
                    <td className="border px-2 py-1">{u.name}</td>
                    <td className="border px-2 py-1">{u.email}</td>
                    <td className="border px-2 py-1">{u.card_id}</td>
                    <td className="border px-2 py-1">{u.included_hours}</td>
                    <td className="border px-2 py-1 flex gap-2">
                      <button className="text-blue-600" onClick={() => setEditingUser(u)}>✏️</button>
                      <button className="text-red-600" onClick={() => deleteUser(u.id)}>🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
