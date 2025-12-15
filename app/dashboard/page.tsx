"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Settings, Bell, HelpCircle, LogOut, Plus, Send, X } from "lucide-react"
import { useUser } from "@/context/userContext"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Cookies from "js-cookie"
import { useUploads } from "@/hooks/mutations/upload/useUploads"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { uploads, addFilesToUpload, removeUpload } = useUploads();

  // Check if user is logged in
  useEffect(() => {
    if (!loading && !user) {
      // Not logged in, redirect to login
      router.push("/login")
    }
  }, [user, loading, router])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleLogout = () => {
    Cookies.remove("auth-token")
    router.push("/login")
  }

  const autoResizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 200) + "px"
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    addFilesToUpload(Array.from(files));

    e.target.value = "";
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue("");
    setIsLoading(true);

    const formData = new FormData();
    formData.append("messages", JSON.stringify(nextMessages));

    // Add files to formData if upload is completed
    uploads
      .filter(u => u.status === "completed")
      .forEach(u => {
        formData.append("files", u.file, u.file.name);
      });

    // Send the request
    const res = await fetch("/api/gemini", {
      method: "POST",
      body: formData,
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    const assistantId = Date.now().toString();

    // Insert empty assistant message first
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    let done = false;
    let accumulated = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: accumulated }
              : m
          )
        );
      }
    }

    // Clear uploads after sending the message
    addFilesToUpload([]); // Clear the uploads array

    setIsLoading(false);
  };

  // Show loading while checking auth
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col text-black">
      <header className="h-14 border-b border-gray-200 bg-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg text-whiten font-bold">PRISM</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
          <span className="hidden sm:inline text-sm text-white">AI Assistant</span>
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
          <span className="text-sm text-gray-600 hidden sm:inline">{user.displayName || user.username}</span>

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
        <main className="w-[70%] flex flex-col border-r border-gray-200 overflow-hidden">
          {/* Chat Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.length === 0 && !isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-300 mb-2">
                    PRISM AI Assistant
                  </h2>
                  <p className="text-2xl text-gray-300">
                    Ask anything to generate documents, specs, or project insights.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 prose prose-sm max-w-none
    ${message.role === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-100 text-gray-900 rounded-bl-none"
                        } 
    ${message.role === "assistant"
                          ? "prose-headings:mt-3"
                          : "prose-invert"
                        }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">

            {/* 🔹 Upload previews section (own row) */}
            {uploads.length > 0 && (
              <div className="mb-3 space-y-2">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50"
                  >
                    {/* Preview */}
                    {upload.file.type.startsWith("image/") ? (
                      <img
                        src={upload.previewUrl}
                        alt={upload.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded text-xs">
                        FILE
                      </div>
                    )}

                    {/* Info + Progress */}
                    <div className="flex-1">
                      <div className="text-xs font-medium truncate">
                        {upload.file.name}
                      </div>

                      <div className="h-1.5 bg-gray-200 rounded mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all ${upload.status === "failed"
                            ? "bg-red-500"
                            : upload.status === "completed"
                              ? "bg-green-500"
                              : "bg-blue-500"
                            }`}
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {upload.status} · {upload.progress}%
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeUpload(upload.id)}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Remove"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 🔹 Controls row */}
            <div className="flex gap-2 items-end">
              {/* Upload button */}
              <label className="p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Plus className="h-4 w-4 text-gray-600" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  autoResizeTextarea()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Ask PRISM anything… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 resize-none px-4 py-3 border border-gray-300 rounded-lg
        focus:ring-2 focus:ring-blue-500 focus:border-transparent
        outline-none text-gray-900 placeholder-gray-500
        max-h-[200px] overflow-y-auto"
                disabled={isLoading}
              />

              {/* Send button */}
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
        disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
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
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Current</span>
                  </div>
                  <p className="text-sm text-gray-900 mb-1">Initial document generation</p>
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
  )
}
