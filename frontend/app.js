const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

const API_BASE_URL = window.API_BASE_URL || window.location.origin;

function CoworkingApp() {
  const [users, setUsers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', cardId: '', included_hours: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Daily Active Users chart
  const [dailyActiveData, setDailyActiveData] = useState([]);
  const [activeRange, setActiveRange] = useState('last7'); // last7, prevMonth, thisMonth

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, checkInsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/users`),
        fetch(`${API_BASE_URL}/api/checkins`)
      ]);
      const usersData = await usersRes.json();
      const checkInsData = await checkInsRes.json();

      setUsers(Array.isArray(usersData) ? usersData : []);
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      setLoading(false);
      generateDailyActiveUsersChart(checkInsData, activeRange);
      setError(null);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError('Failed to load data.');
    }
  };

  const handleCheckIn = async (cardId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId })
      });
      const result = await res.json();
      if (res.ok) loadData();
      else alert(result.error || 'Error processing check-in');
    } catch (err) { alert(err.message); }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.cardId) return alert('Name and Card ID required');
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          card_id: newUser.cardId,
          included_hours: parseInt(newUser.included_hours) || 0
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to add user');
      } else {
        setNewUser({ name: '', email: '', cardId: '', included_hours: 0 });
        loadData();
      }
    } catch (err) { alert(err.message); }
  };

  const updateUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          card_id: editingUser.card_id,
          included_hours: parseInt(editingUser.included_hours) || 0
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save user');
      } else {
        setEditingUser(null);
        loadData();
      }
    } catch (err) { alert(err.message); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/users/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const getCurrentlyCheckedIn = () => checkIns.filter(c => !c.check_out);
  const getTodayCheckIns = () => {
    const today = new Date().toDateString();
    return checkIns.filter(c => new Date(c.check_in).toDateString() === today);
  };

  const getUserStats = (userId) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const userCheckIns = checkIns.filter(c => c.user_id === userId && c.check_out && new Date(c.check_in) >= firstDay);
    const totalMinutes = userCheckIns.reduce((acc, c) => acc + (new Date(c.check_out) - new Date(c.check_in)) / 60000, 0);
    return {
      totalVisits: userCheckIns.length,
      totalHours: Math.floor(totalMinutes / 60)
    };
  };

  const generateDailyActiveUsersChart = (checkInsData, range) => {
    const now = new Date();
    let start, end = new Date();
    if (range === 'last7') start = new Date(now.getTime() - 6*24*60*60*1000);
    else if (range === 'prevMonth') {
      start = new Date(now.getFullYear(), now.getMonth()-1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (range === 'thisMonth') start = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyCounts = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dailyCounts[d.toISOString().slice(0,10)] = 0;
    }
    checkInsData.forEach(c => {
      const dateStr = new Date(c.check_in).toISOString().slice(0,10);
      if (dateStr in dailyCounts) dailyCounts[dateStr]++;
    });
    setDailyActiveData(Object.entries(dailyCounts));
  };

  const [checkinSortCol, setCheckinSortCol] = useState('check_in');
  const [checkinSortDir, setCheckinSortDir] = useState('desc');
  const [dailySortCol, setDailySortCol] = useState('date');
  const [dailySortDir, setDailySortDir] = useState('asc');

  const sortedCheckIns = [...checkIns].sort((a,b)=>{
    const valA = a[checkinSortCol], valB = b[checkinSortCol];
    if(valA<valB) return checkinSortDir==='asc'? -1:1;
    if(valA>valB) return checkinSortDir==='asc'? 1:-1;
    return 0;
  });

  const sortedDailyData = [...dailyActiveData].sort((a,b)=>{
    const valA = a[dailySortCol==='date'?0:1];
    const valB = b[dailySortCol==='date'?0:1];
    if(valA<valB) return dailySortDir==='asc'? -1:1;
    if(valA>valB) return dailySortDir==='asc'? 1:-1;
    return 0;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center">{error}</div>;

  return (
    <div className="min-h-screen p-6 font-sans bg-white text-black">
      <header className="mb-6 flex items-center gap-4">
        <img src="rami_logo_new.avif" alt="Logo" className="h-12"/>
        <div>
          <h1 className="text-3xl font-bold">Rami Ceramics Coworking</h1>
          <p className="text-gray-500">Check-in/out Management</p>
        </div>
      </header>

      <div className="flex gap-4 mb-6 flex-wrap">
        {['dashboard','users','history','simulator'].map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            className={`px-4 py-2 rounded ${activeTab===tab?'bg-black text-white':'bg-white border border-black hover:text-gray-600'}`}>
            {tab.charAt(0).toUpperCase()+tab.slice(1)}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab==='dashboard' &&
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded shadow">Currently In: <b>{getCurrentlyCheckedIn().length}</b></div>
          <div className="p-4 border rounded shadow">Today's Check-ins: <b>{getTodayCheckIns().length}</b></div>
          <div className="p-4 border rounded shadow">Total Users: <b>{users.length}</b></div>
        </div>
      }

      {/* USERS */}
      {activeTab==='users' &&
        <div className="space-y-6">
          {/* Add User */}
          <div className="p-4 border rounded shadow">
            <h2 className="font-bold mb-2">Add New User</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label>Name</label>
                <input type="text" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} className="border px-2 py-1 w-full"/>
              </div>
              <div>
                <label>Email</label>
                <input type="text" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} className="border px-2 py-1 w-full"/>
              </div>
              <div>
                <label>Card ID</label>
                <input type="text" value={newUser.cardId} onChange={e=>setNewUser({...newUser,cardId:e.target.value})} className="border px-2 py-1 w-full"/>
              </div>
              <div>
                <label>Included Hours</label>
                <input type="number" value={newUser.included_hours} onChange={e=>setNewUser({...newUser,included_hours:e.target.value})} className="border px-2 py-1 w-full"/>
              </div>
              <div className="md:col-span-4">
                <button onClick={addUser} className="bg-black text-white px-4 py-2 rounded mt-2">Add User</button>
              </div>
            </div>
          </div>

          {/* Registered Users Table */}
          <div className="p-4 border rounded shadow overflow-x-auto">
            <h2 className="font-bold mb-2">Registered Users</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  {['Name','Email','Card ID','Included Hours','Stats','Actions'].map((col,i)=>
                    <th key={i} className="border px-2 py-1">{col}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map(user=>{
                  const stats = getUserStats(user.id);
                  return <tr key={user.id}>
                    <td className="border px-2 py-1">
                      {editingUser?.id===user.id?
                        <div>
                          <label>Name</label>
                          <input type="text" value={editingUser.name} onChange={e=>setEditingUser({...editingUser,name:e.target.value})} className="border px-1 py-1 w-full"/>
                        </div>: user.name
                      }
                    </td>
                    <td className="border px-2 py-1">
                      {editingUser?.id===user.id?
                        <div>
                          <label>Email</label>
                          <input type="text" value={editingUser.email} onChange={e=>setEditingUser({...editingUser,email:e.target.value})} className="border px-1 py-1 w-full"/>
                        </div>: user.email
                      }
                    </td>
                    <td className="border px-2 py-1">
                      {editingUser?.id===user.id?
                        <div>
                          <label>Card ID</label>
                          <input type="text" value={editingUser.card_id} onChange={e=>setEditingUser({...editingUser,card_id:e.target.value})} className="border px-1 py-1 w-full"/>
                        </div>: user.card_id
                      }
                    </td>
                    <td className="border px-2 py-1">
                      {editingUser?.id===user.id?
                        <div>
                          <label>Included Hours</label>
                          <input type="number" value={editingUser.included_hours} onChange={e=>setEditingUser({...editingUser,included_hours:e.target.value})} className="border px-1 py-1 w-full"/>
                        </div>: user.included_hours
                      }
                    </td>
                    <td className="border px-2 py-1">{stats.totalVisits} visits • {stats.totalHours}h total</td>
                    <td className="border px-2 py-1 flex gap-1">
                      {editingUser?.id===user.id?
                        <>
                          <button onClick={updateUser} className="px-2 py-1 bg-green-600 text-white rounded">Save</button>
                          <button onClick={()=>setEditingUser(null)} className="px-2 py-1 bg-gray-500 text-white rounded">Cancel</button>
                        </>
                        :
                        <>
                          <button onClick={()=>setEditingUser(user)} className="px-2 py-1 bg-blue-600 text-white rounded">Edit</button>
                          <button onClick={()=>deleteUser(user.id)} className="px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                        </>
                      }
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* HISTORY */}
      {activeTab==='history' &&
        <div className="space-y-6">
          {/* Check-in/out History */}
          <div className="p-4 border rounded shadow overflow-x-auto">
            <h2 className="font-bold mb-2">Check-in/out History</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  {['user_name','check_in','check_out','duration'].map(col=>(
                    <th key={col} className="border px-2 py-1 cursor-pointer" 
                        onClick={()=>{setCheckinSortCol(col); setCheckinSortDir(checkinSortDir==='asc'?'desc':'asc');}}>
                      {col} {checkinSortCol===col?(checkinSortDir==='asc'?'▲':'▼'):""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCheckIns.map(c=>(
                  <tr key={c.id}>
                    <td className="border px-2 py-1">{c.user_name}</td>
                    <td className="border px-2 py-1">{new Date(c.check_in).toLocaleString()}</td>
                    <td className="border px-2 py-1">{c.check_out?new Date(c.check_out).toLocaleString():'✅ In'}</td>
                    <td className="border px-2 py-1">{c.duration||'-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Daily Active Users */}
          <div className="p-4 border rounded shadow overflow-x-auto">
            <h2 className="font-bold mb-2">Daily Active Users</h2>
            <div className="flex gap-2 mb-2">
              <button onClick={()=>{setActiveRange('last7'); generateDailyActiveUsersChart(checkIns,'last7');}} className="px-2 py-1 border rounded">Last 7 days</button>
              <button onClick={()=>{setActiveRange('prevMonth'); generateDailyActiveUsersChart(checkIns,'prevMonth');}} className="px-2 py-1 border rounded">Previous month</button>
              <button onClick={()=>{setActiveRange('thisMonth'); generateDailyActiveUsersChart(checkIns,'thisMonth');}} className="px-2 py-1 border rounded">This month</button>
            </div>
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  {['date','activeUsers'].map(col=>(
                    <th key={col} className="border px-2 py-1 cursor-pointer"
                        onClick={()=>{setDailySortCol(col); setDailySortDir(dailySortDir==='asc'?'desc':'asc')}}>
                      {col} {dailySortCol===col?(dailySortDir==='asc'?'▲':'▼'):""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedDailyData.map(([date,count])=>(
                  <tr key={date}>
                    <td className="border px-2 py-1">{date}</td>
                    <td className="border px-2 py-1">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* SIMULATOR */}
      {activeTab==='simulator' &&
        <div className="p-4 border rounded shadow grid grid-cols-1 md:grid-cols-3 gap-2">
          {users.map(u=>(
            <button key={u.id} onClick={()=>handleCheckIn(u.card_id)} className="p-2 border rounded hover:bg-gray-200">
              <p>{u.name}</p>
              <p className="text-xs">Card: {u.card_id}</p>
            </button>
          ))}
        </div>
      }
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<CoworkingApp />);
