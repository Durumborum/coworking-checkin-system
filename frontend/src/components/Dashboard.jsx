export default function Dashboard({ users, checkIns, getCurrentlyCheckedIn, getTodayCheckIns }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 border rounded shadow">
        <p>Currently In</p>
        <p className="text-2xl font-bold">{getCurrentlyCheckedIn().length}</p>
      </div>
      <div className="p-4 border rounded shadow">
        <p>Today's Check-ins</p>
        <p className="text-2xl font-bold">{getTodayCheckIns().length}</p>
      </div>
      <div className="p-4 border rounded shadow">
        <p>Total Users</p>
        <p className="text-2xl font-bold">{users.length}</p>
      </div>
    </div>
  );
}
