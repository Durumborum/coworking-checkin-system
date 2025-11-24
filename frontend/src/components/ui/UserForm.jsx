import Button from "./Button.jsx";

export default function UserForm({ user, setUser, onSave, onCancel }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div>
        <label className="block text-xs font-semibold">Name</label>
        <input
          type="text"
          value={user.name}
          onChange={e => setUser({ ...user, name: e.target.value })}
          className="px-3 py-2 border rounded w-full"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold">Email</label>
        <input
          type="email"
          value={user.email}
          onChange={e => setUser({ ...user, email: e.target.value })}
          className="px-3 py-2 border rounded w-full"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold">Card ID</label>
        <input
          type="text"
          value={user.card_id}
          onChange={e => setUser({ ...user, card_id: e.target.value })}
          className="px-3 py-2 border rounded w-full"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold">Included Hours</label>
        <input
          type="number"
          value={user.included_hours || 0}
          onChange={e =>
            setUser({ ...user, included_hours: parseInt(e.target.value) || 0 })
          }
          className="px-3 py-2 border rounded w-full"
        />
      </div>
      <div className="flex gap-2">
        <Button
          className="bg-green-600 text-white hover:bg-green-700 flex-1"
          onClick={onSave}
        >
          💾 Save
        </Button>
        <Button className="bg-gray-500 text-white hover:bg-gray-600" onClick={onCancel}>
          ✖
        </Button>
      </div>
    </div>
  );
}
