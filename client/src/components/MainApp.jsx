import { useState } from 'react';
import logoMark from '../assets/exhibit-control-logo.svg';

export default function MainApp({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <img src={logoMark} alt="Exhibit Control" className="h-10 w-auto" />
              <h1 className="text-xl font-semibold text-slate-900">Client Portal</h1>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
                  {(user.name || user.displayName || user.email).charAt(0).toUpperCase()}
                </div>
                <span>{user.name || user.displayName || user.email}</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <div className="px-4 py-2 text-xs text-slate-500">
                      Signed in as
                    </div>
                    <div className="px-4 py-2 text-sm text-slate-900">
                      {user.email}
                    </div>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">
            Welcome, {user.name || user.displayName}!
          </h2>
          
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-2">User Information</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email:</dt>
                  <dd className="font-medium text-slate-900">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Role:</dt>
                  <dd className="font-medium text-slate-900 capitalize">{user.role}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">User ID:</dt>
                  <dd className="font-mono text-xs text-slate-600">{user.id}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-900">Your Projects</h3>
              <p className="mt-2 text-sm text-slate-500">
                Projects and content will be displayed here.
              </p>
              <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Create Project
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
