import React from 'react';

const AddTransactionModal = ({ setShowAddTransaction }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add Transaction</h2>
          <button onClick={() => setShowAddTransaction(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Transaction Type</label>
            <div className="flex gap-3">
              <button className="flex-1 bg-green-500/20 text-green-500 border border-green-500 py-2 rounded-lg font-semibold">Credit (Income)</button>
              <button className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg font-semibold">Debit (Expense)</button>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Narration</label>
            <input type="text" placeholder="Transaction description" className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Amount (INR)</label>
            <input type="number" placeholder="0.00" className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Merchant Category</label>
            <select className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500">
              <option>Select category</option>
              <option>Shopping</option>
              <option>Travel</option>
              <option>Income</option>
              <option>Health</option>
              <option>Food</option>
              <option>Utilities</option>
              <option>Entertainment</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Date</label>
            <input type="datetime-local" className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500" />
          </div>
          <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors mt-4">
            Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransactionModal;