'use client';

import React, { useState, useEffect, useRef } from 'react';
import { hybridFileAccessManager, type FileSelectionPrompt } from '@/lib/file-access-manager';

export function FileReselectionPrompt() {
    const [prompts, setPrompts] = useState<FileSelectionPrompt[]>([]);
    const [currentPrompt, setCurrentPrompt] = useState<FileSelectionPrompt | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Register callback to receive file selection requests
        hybridFileAccessManager.setPromptCallback((prompt) => {
            setPrompts((prev) => {
                // Avoid duplicates
                if (prev.some((p) => p.uploadId === prompt.uploadId)) {
                    return prev;
                }
                const next = [...prev, prompt];
                // Show first prompt if none is currently shown
                if (!currentPrompt) {
                    setCurrentPrompt(next[0]);
                }
                return next;
            });
        });
    }, [currentPrompt]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentPrompt) {
            const file = e.target.files[0];

            // Resolve the prompt with the selected file
            hybridFileAccessManager.resolveFilePrompt(currentPrompt.uploadId, file);

            // Move to next prompt
            moveToNextPrompt();

            // Reset file input
            e.target.value = '';
        }
    };

    const handleCancel = () => {
        if (currentPrompt) {
            hybridFileAccessManager.resolveFilePrompt(currentPrompt.uploadId, null);
            moveToNextPrompt();
        }
    };

    const handleSkip = () => {
        if (currentPrompt) {
            // Move current prompt to end of queue
            setPrompts((prev) => {
                const filtered = prev.filter((p) => p.uploadId !== currentPrompt.uploadId);
                return [...filtered, currentPrompt];
            });
            moveToNextPrompt();
        }
    };

    const moveToNextPrompt = () => {
        setPrompts((prev) => {
            const next = prev.filter((p) => p.uploadId !== currentPrompt?.uploadId);
            setCurrentPrompt(next[0] || null);
            return next;
        });
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString();
    };

    if (!currentPrompt) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                {/* Modal */}
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <svg
                                className="w-6 h-6 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900">Resume Upload</h3>
                        </div>

                        {prompts.length > 1 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {prompts.length} pending
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            To resume uploading, please select the same file again:
                        </p>

                        {/* File Info */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-2">
                                <svg
                                    className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {currentPrompt.fileName}
                                    </p>
                                    <div className="mt-1 space-y-1 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">Size:</span>
                                            <span>{formatBytes(currentPrompt.fileSize)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">Type:</span>
                                            <span>{currentPrompt.mimeType}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">Modified:</span>
                                            <span>{formatDate(currentPrompt.lastModified)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                            <svg
                                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <p className="text-xs text-amber-800">
                                Make sure you select the exact same file to continue the upload from where it stopped.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            Select File
                        </button>

                        <div className="flex gap-2">
                            {prompts.length > 1 && (
                                <button
                                    onClick={handleSkip}
                                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                >
                                    Skip
                                </button>
                            )}
                            <button
                                onClick={handleCancel}
                                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                            >
                                Cancel Upload
                            </button>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept={currentPrompt.mimeType}
                    />
                </div>
            </div>

            {/* Additional CSS for animations */}
            <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-in-from-bottom-4 {
          from {
            transform: translateY(1rem);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-in {
          animation-duration: 200ms;
          animation-fill-mode: both;
        }

        .fade-in {
          animation-name: fade-in;
        }

        .slide-in-from-bottom-4 {
          animation-name: slide-in-from-bottom-4;
        }
      `}</style>
        </>
    );
}