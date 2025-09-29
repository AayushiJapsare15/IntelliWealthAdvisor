import React from 'react';
import { DollarSign } from 'lucide-react';

const LoginScreen = ({ setIsLoggedIn }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-green-500 p-3 rounded-xl">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white ml-3">Finora</h1>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-gray-400 mb-6 text-center">Sign in to manage your finances</p>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          />
          <button
            onClick={() => setIsLoggedIn(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
        <p className="text-gray-400 text-sm text-center mt-6">
          Don't have an account? <span className="text-green-500 cursor-pointer hover:underline">Sign up</span>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;