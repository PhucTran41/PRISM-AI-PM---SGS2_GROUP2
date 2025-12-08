// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  Plus,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Check if user is logged in
  useEffect(() => {
    const mockUser = localStorage.getItem("mockUser");

    if (!mockUser) {
      // Not logged in, redirect to login
      router.push("/login");
      return;
    }

    // Set user data
    setUser(JSON.parse(mockUser));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("mockUser");
    router.push("/login");
  };

  // Show loading while checking auth
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-black">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">PRISM</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
          <span className="hidden sm:inline text-sm text-gray-600">
            AI Assistant
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* New Project Button */}
          <Link
            href="/dashboard/new-project"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
          </Link>

          {/* Show logged in user */}
          <span className="text-sm text-gray-600 hidden sm:inline">
            {user.name || user.email}
          </span>

          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
              <HelpCircle className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
              <Bell className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Area - 70% */}
        <main className="w-[70%] flex flex-col p-4 gap-4 border-r border-gray-200 overflow-hidden">
          {/* Document Preview Placeholder */}
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-bold">Project Feature List</h1>
              </div>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                v1.0 — Draft
              </span>
            </div>

            <div className="prose max-w-none">
              <h2 className="text-lg font-semibold mb-3">
                PRISM — Feature Specification Document
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Last updated: {new Date().toLocaleDateString()} • Author: AI
                Assistant
              </p>

              <h3 className="text-base font-semibold mt-6 mb-3">
                Core Features
              </h3>
              <ul className="space-y-3 list-none pl-0">
                <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-green-500 mt-1">✓</span>
                  <div>
                    <span className="font-medium">
                      AI-Powered Document Generation
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Automatically generate comprehensive project documentation
                      from simple text briefs
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-green-500 mt-1">✓</span>
                  <div>
                    <span className="font-medium">Interactive Refinement</span>
                    <p className="text-sm text-gray-600 mt-1">
                      Chat-based interface to refine and update specific
                      sections of generated documents
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-400 mt-1">○</span>
                  <div>
                    <span className="font-medium">Multi-Format Export</span>
                    <p className="text-sm text-gray-600 mt-1">
                      Download documentation as PDF, Markdown, or DOCX formats
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Chat Box Placeholder */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Refinement Chat</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Turn 1
              </span>
            </div>

            <div className="space-y-3">
              <textarea
                placeholder="Ask PRISM to refine this document... (e.g., 'Add more details to the security section')"
                className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-900"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  AI-powered refinements based on context
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                  Refine
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar - 30% */}
        <aside className="w-[30%] p-4 overflow-auto">
          <div className="space-y-4">
            {/* Export Button */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-3">
                Export Document
              </button>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50">
                  PDF
                </button>
                <button className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50">
                  Markdown
                </button>
                <button className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50">
                  DOCX
                </button>
              </div>
            </div>

            {/* Project History */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold">Project History</h3>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="p-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-medium">v1.0</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                      Current
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">
                    Initial document generation
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>Just now</span>
                    <span>AI Assistant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
