import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Upload } from 'lucide-react';

const Dashboard = ({ 
  loading, 
  stats, 
  transactions, 
  setShowAddTransaction, 
  loadTransactionsFromFile,
  getExpenseBreakdown,
  getWeeklyData,
  getRecentTransactions 
}) => {
  const expenseBreakdown = getExpenseBreakdown();
  const weeklyData = getWeeklyData();
  const recentTransactions = getRecentTransactions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white text-xl">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, User</h1>
          <p className="text-gray-400 mt-1">This is your overview report for all transactions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadTransactionsFromFile}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
          >
            <Upload className="w-5 h-5" />
            Reload Data
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-white">₹{stats.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-green-500 text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Latest Balance
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Total Income</p>
          <p className="text-3xl font-bold text-white">₹{stats.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-green-500 text-sm mt-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            All Credits
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Total Expenses</p>
          <p className="text-3xl font-bold text-white">₹{stats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            All Debits
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Savings Rate</p>
          <p className="text-3xl font-bold text-white">{stats.savingsRate}%</p>
          <p className="text-gray-400 text-sm mt-2">
            Of total income
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Transaction Overview</h3>
              <p className="text-gray-400 text-sm">Weekly income vs expenses</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-400">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-400">Expenses</span>
              </div>
            </div>
          </div>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-2">Expenses Breakdown</h3>
          <p className="text-gray-400 text-sm mb-6">By merchant category</p>
          {expenseBreakdown.length > 0 ? (
            <>
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {expenseBreakdown.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-300">{item.name}</span>
                    </div>
                    <span className="text-white font-semibold">₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No expense data
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
            <p className="text-gray-400 text-sm">Latest {recentTransactions.length} transactions</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3">Date</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Currency</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-700 text-sm">
                    <td className="py-4 text-gray-300">{transaction.date}</td>
                    <td className="py-4 text-white max-w-xs truncate">{transaction.title}</td>
                    <td className="py-4 text-gray-300">{transaction.category}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        transaction.type === 'INCOME' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`py-4 font-semibold ${transaction.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                      {transaction.type === 'INCOME' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 text-gray-300">{transaction.currency}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;