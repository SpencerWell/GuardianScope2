import { useState, useEffect } from 'react';
import { Bell, Check, X, AlertTriangle, Users, Radio } from 'lucide-react';

export default function GuardianDashboard() {
  const [tasks, setTasks] = useState([]);
  const [operators, setOperators] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    approvalRate: 0
  });

  // Mock data for demo - replace with actual contract calls
  useEffect(() => {
    setTasks([
      { id: 1, content: "First moderation request about community guidelines", status: "pending", votes: { approve: 2, reject: 1 }, timestamp: "2025-02-08 10:30" },
      { id: 2, content: "Review of user-submitted content for appropriateness", status: "completed", votes: { approve: 3, reject: 0 }, timestamp: "2025-02-08 09:15" },
      { id: 3, content: "Checking content against platform policies", status: "pending", votes: { approve: 1, reject: 2 }, timestamp: "2025-02-08 11:45" }
    ]);

    setOperators([
      { id: 1, address: "0x1234...5678", tasksCompleted: 45, accuracy: 98 },
      { id: 2, address: "0x8765...4321", tasksCompleted: 38, accuracy: 95 },
      { id: 3, address: "0x9876...2468", tasksCompleted: 52, accuracy: 97 }
    ]);

    setStats({
      totalTasks: 85,
      pendingTasks: 12,
      completedTasks: 73,
      approvalRate: 86
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Guardian Scope Dashboard based on EigenLayer + OpenAI </h1>
          <p className="text-gray-600">Decentralized Content Moderation System</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-semibold">{stats.totalTasks}</p>
              </div>
              <Radio className="text-blue-500 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-semibold">{stats.pendingTasks}</p>
              </div>
              <Bell className="text-yellow-500 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Tasks</p>
                <p className="text-2xl font-semibold">{stats.completedTasks}</p>
              </div>
              <Check className="text-green-500 w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approval Rate</p>
                <p className="text-2xl font-semibold">{stats.approvalRate}%</p>
              </div>
              <AlertTriangle className="text-purple-500 w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Moderation Tasks</h2>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-900">Task #{task.id}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{task.content}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div className="flex space-x-4">
                        <span className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-1" />
                          {task.votes.approve}
                        </span>
                        <span className="flex items-center">
                          <X className="w-4 h-4 text-red-500 mr-1" />
                          {task.votes.reject}
                        </span>
                      </div>
                      <span>{task.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operators List */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Active Operators</h2>
              <div className="space-y-4">
                {operators.map((operator) => (
                  <div key={operator.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{operator.address}</span>
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tasks: {operator.tasksCompleted}</span>
                      <span>Accuracy: {operator.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}