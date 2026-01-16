import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronLeft, ChevronRight, BarChart2, TrendingUp, Calendar, Download, Plus, Trash2, Trophy, AlertCircle, User, LogOut } from 'lucide-react';

// --- Utils ---

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// --- Components ---

const ProgressBar = ({ percentage, colorClass = "bg-blue-500" }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
    <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
  </div>
);

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.replace('bg-', '')}`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const LoginScreen = ({ onLogin }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Calendar className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Habit Master</h1>
          <p className="text-slate-500">Track your goals, built for sharing.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            <span>{loading ? 'Entering...' : 'Start Tracking'}</span>
            {!loading && <ChevronRight size={18} />}
          </button>
          <p className="text-xs text-center text-slate-400 mt-4">
            Simple login: If name exists, we load it. If not, we create it.
          </p>
        </form>
      </div>
    </div>
  );
};

export default function HabitTracker() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [habitData, setHabitData] = useState([]); // Array of habit objects
  // Each habit: { id, name, completedDays: [] }
  const [newHabitName, setNewHabitName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- Data Fetching ---
  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/data?userId=${user.id}&month=${currentMonth}&year=2026`);
      if (res.ok) {
        const data = await res.json();
        setHabitData(data);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, currentMonth]);

  // --- Actions ---

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('habit_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setHabitData([]);
    localStorage.removeItem('habit_user');
  };

  useEffect(() => {
    const saved = localStorage.getItem('habit_user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  const toggleDay = async (habitId, day) => {
    // 1. Optimistic Update
    setHabitData(prev => prev.map(h => {
      if (h.id === habitId) {
        const isCompleted = h.completedDays.includes(day);
        return {
          ...h,
          completedDays: isCompleted
            ? h.completedDays.filter(d => d !== day)
            : [...h.completedDays, day]
        };
      }
      return h;
    }));

    // 2. API Call
    try {
      await fetch('/api/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          day,
          month: currentMonth,
          year: 2026
        })
      });
    } catch (err) {
      console.error("Failed to toggle", err);
      // Revert on error? For simplicity, we skip revert logic but normally we would.
    }
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    const tempName = newHabitName;
    setNewHabitName("");

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: tempName })
      });
      if (res.ok) {
        const newHabit = await res.json();
        setHabitData(prev => [...prev, newHabit]);
      }
    } catch (err) {
      console.error("Failed to add habit", err);
    }
  };

  const deleteHabit = async (habitId) => {
    if (!confirm("Delete this habit permanently?")) return;

    // Optimistic
    setHabitData(prev => prev.filter(h => h.id !== habitId));

    try {
      await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const exportToCSV = () => {
    // Simple frontend CSV generation based on current view
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Habit,Day,Status\n";

    const monthName = MONTH_NAMES[currentMonth];
    const daysInMonth = DAYS_IN_MONTH[currentMonth];

    habitData.forEach(habit => {
      for (let d = 1; d <= daysInMonth; d++) {
        const status = habit.completedDays.includes(d) ? "Completed" : "Missed";
        csvContent += `${monthName},${habit.name},${d},${status}\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `habits_${user.username}_${monthName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Analytics Calculations ---

  const analytics = useMemo(() => {
    if (!habitData.length) return { completionRate: 0, bestHabit: null, mostProductiveDayIndex: 0, totalChecks: 0, dailyCounts: [] };

    const totalDays = DAYS_IN_MONTH[currentMonth];

    // 1. Overall Completion Rate
    const totalPossibleChecks = habitData.length * totalDays;
    const totalChecks = habitData.reduce((acc, h) => acc + h.completedDays.length, 0);
    const completionRate = totalPossibleChecks > 0 ? Math.round((totalChecks / totalPossibleChecks) * 100) : 0;

    // 2. Best Habit
    let bestHabit = habitData[0];
    let maxChecks = -1;
    habitData.forEach(h => {
      if (h.completedDays.length > maxChecks) {
        maxChecks = h.completedDays.length;
        bestHabit = h;
      }
    });

    // 3. Daily Activity (Heatmap-ish data)
    const dailyCounts = Array(totalDays).fill(0);
    habitData.forEach(h => {
      h.completedDays.forEach(day => {
        if (day <= totalDays) dailyCounts[day - 1]++;
      });
    });
    const mostProductiveDayIndex = dailyCounts.indexOf(Math.max(...dailyCounts)) + 1;

    return { completionRate, bestHabit, mostProductiveDayIndex, totalChecks, dailyCounts };
  }, [habitData, currentMonth]);

  // --- Render ---

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const currentDays = DAYS_IN_MONTH[currentMonth];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3 mb-4 md:mb-0">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Habit Master
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">welcome back, {user.username}</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setCurrentMonth(prev => Math.max(0, prev - 1))}
            disabled={currentMonth === 0}
            className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="w-32 text-center font-semibold text-slate-700 select-none">
            {MONTH_NAMES[currentMonth]}
          </span>
          <button
            onClick={() => setCurrentMonth(prev => Math.min(11, prev + 1))}
            disabled={currentMonth === 11}
            className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium mr-2"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">

        {/* Analytics Dashboard Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Monthly Completion"
            value={`${analytics.completionRate}%`}
            icon={TrendingUp}
            color="bg-green-500"
            subtext={`${analytics.totalChecks} checks total`}
          />
          <StatCard
            title="Top Performer"
            value={analytics.bestHabit ? analytics.bestHabit.name : "None"}
            icon={Trophy}
            color="bg-yellow-500"
            subtext="Most consistent habit"
          />
          <StatCard
            title="Busiest Day"
            value={`Day ${analytics.mostProductiveDayIndex}`}
            icon={BarChart2}
            color="bg-purple-500"
            subtext="Most checks logged"
          />
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-500">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600">{analytics.completionRate}%</span>
            </div>
            <ProgressBar percentage={analytics.completionRate} colorClass="bg-blue-600" />
          </div>
        </section>

        {/* Interactive Grid Section */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="New Habit Name..."
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 md:w-64"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHabit()}
              />
              <button
                onClick={addHabit}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="text-xs text-slate-400 font-medium flex items-center gap-4">
              {isLoading && <span className="text-blue-500 animate-pulse">Syncing...</span>}
              <span>Click cells to toggle status</span>
            </div>
          </div>

          {/* Scrolling Grid */}
          <div className="overflow-auto flex-1 relative custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 border-b border-r border-slate-200 min-w-[200px] font-semibold text-slate-600 sticky left-0 bg-slate-50 z-20">
                    Habit
                  </th>
                  {Array.from({ length: currentDays }).map((_, i) => (
                    <th key={i} className="p-2 border-b border-slate-200 min-w-[40px] text-center text-xs font-semibold text-slate-500">
                      {i + 1}
                    </th>
                  ))}
                  <th className="p-4 border-b border-l border-slate-200 min-w-[100px] text-center font-semibold text-slate-600">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody>
                {habitData.length === 0 ? (
                  <tr>
                    <td colSpan={currentDays + 2} className="p-8 text-center text-slate-400 italic">
                      No habits yet. Add one above to get started!
                    </td>
                  </tr>
                ) : habitData.map((habit, idx) => {
                  const completedCount = habit.completedDays.length;
                  const percent = Math.round((completedCount / currentDays) * 100);

                  return (
                    <tr key={habit.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 border-b border-r border-slate-200 font-medium text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 flex justify-between items-center min-w-[200px]">
                        <span className="truncate pr-2">{habit.name}</span>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                      {Array.from({ length: currentDays }).map((_, dayIdx) => {
                        const dayNum = dayIdx + 1;
                        const isChecked = habit.completedDays.includes(dayNum);
                        return (
                          <td key={dayIdx} className="p-1 border-b border-slate-100 text-center relative">
                            <label className="cursor-pointer w-full h-full block flex items-center justify-center py-2">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={isChecked}
                                onChange={() => toggleDay(habit.id, dayNum)}
                              />
                              <div className={`w-5 h-5 rounded transition-all duration-200 flex items-center justify-center
                                ${isChecked ? 'bg-blue-500 scale-110 shadow-sm' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                {isChecked && <Check size={14} className="text-white" />}
                              </div>
                            </label>
                          </td>
                        );
                      })}
                      <td className="p-2 border-b border-l border-slate-200 text-center min-w-[100px]">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-bold ${percent >= 80 ? 'text-green-600' : percent >= 50 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {percent}%
                          </span>
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-blue-500' : 'bg-slate-400'}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}