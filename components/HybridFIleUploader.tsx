// components/HybridFileUploader.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { hybridUploadManager } from '@/lib/hybrid-upload-manager';
import { FileReselectionPrompt } from './FileSelectionPrompt';
import { UploadProgress, UploadState } from '@/services/upload/types';

interface FileUploadItem {
    id: string;
    progress: UploadProgress;
    state: UploadState;
}

export default function HybridFileUploader() {
    const [uploads, setUploads] = useState<Map<string, FileUploadItem>>(new Map());
    const [isDragging, setIsDragging] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Initialize the hybrid upload manager
        hybridUploadManager.init().then(() => {
            setIsInitialized(true);
            console.log('Hybrid Upload Manager ready');
        });
    }, []);

    const updateUpload = useCallback((id: string, updates: Partial<FileUploadItem>) => {
        setUploads((prev) => {
            const next = new Map(prev);
            const existing = next.get(id);
            if (existing) {
                next.set(id, { ...existing, ...updates });
            } else {
                next.set(id, {
                    id,
                    progress: updates.progress!,
                    state: updates.state!,
                });
            }
            return next;
        });
    }, []);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        if (!isInitialized) {
            console.warn('Upload manager not initialized yet');
            return;
        }

        const fileArray = Array.from(files);
        const uploadIds = await hybridUploadManager.addFiles(fileArray);

        uploadIds.forEach((id, index) => {
            const file = fileArray[index];

            // Initialize upload item
            updateUpload(id, {
                id,
                progress: {
                    id,
                    fileName: file.name,
                    uploadedBytes: 0,
                    totalBytes: file.size,
                    percentage: 0,
                    speed: 0,
                    eta: 0,
                    status: 'queued',
                    chunkProgress: {},
                },
                state: {
                    id,
                    file: {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified,
                    },
                    uploadId: '',
                    key: '',
                    chunkSize: 10 * 1024 * 1024,
                    completedParts: [],
                    nextChunkIndex: 0,
                    retries: {},
                    status: 'queued',
                    uploadedBytes: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            });

            // Subscribe to progress updates
            hybridUploadManager.onProgress(id, (progress) => {
                updateUpload(id, { progress });
            });

            // Subscribe to state changes
            hybridUploadManager.onStateChange(id, (state) => {
                updateUpload(id, { state });
            });
        });
    }, [isInitialized, updateUpload]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset input
        }
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    const handlePause = useCallback((uploadId: string) => {
        hybridUploadManager.pauseUpload(uploadId);
    }, []);

    const handleResume = useCallback((uploadId: string) => {
        hybridUploadManager.resumeUpload(uploadId);
    }, []);

    const handleCancel = useCallback((uploadId: string) => {
        hybridUploadManager.cancelUpload(uploadId);
        setUploads((prev) => {
            const next = new Map(prev);
            next.delete(uploadId);
            return next;
        });
    }, []);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    const formatSpeed = (bytesPerSecond: number): string => {
        return `${formatBytes(bytesPerSecond)}/s`;
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'completed':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            case 'paused':
                return 'bg-yellow-500';
            case 'uploading':
            case 'starting':
                return 'bg-blue-500';
            case 'retrying':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'uploading':
                return (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const uploadsArray = Array.from(uploads.values());
    const totalProgress = uploadsArray.length > 0
        ? uploadsArray.reduce((sum, u) => sum + u.progress.percentage, 0) / uploadsArray.length
        : 0;

    const stats = isInitialized ? hybridUploadManager.getStats() : null;

    return (
        <>
            <div className="w-full max-w-4xl mx-auto p-6">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">File Upload</h2>

                        {stats && (
                            <div className="text-xs text-gray-500 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Active:</span>
                                    <span>{stats.activeUploads}</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="font-medium">Queued:</span>
                                    <span>{stats.queuedUploads}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">In Memory:</span>
                                    <span>{stats.inMemoryCount}</span>
                                    {stats.fileSystemAvailable && (
                                        <>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-green-600">✓ File System API</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                            }`}
                    >
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <p className="mt-4 text-sm text-gray-600">
                            Drag and drop files here, or{' '}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                                disabled={!isInitialized}
                            >
                                browse
                            </button>
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            Supports: Images (JPEG, PNG, WebP), Videos (MP4), Documents (PDF, DOCX, TXT)
                        </p>
                        <p className="text-xs text-gray-500">Max file size: 1GB</p>

                        {!isInitialized && (
                            <p className="mt-3 text-xs text-yellow-600">
                                Initializing upload system...
                            </p>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        disabled={!isInitialized}
                    />
                </div>

                {/* Global Progress */}
                {uploadsArray.length > 0 && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className="text-sm text-gray-600">{totalProgress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${totalProgress}%` }}
                            />
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span>{uploadsArray.filter(u => u.state.status === 'completed').length} completed</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <span>{uploadsArray.filter(u => ['uploading', 'starting'].includes(u.state.status)).length} uploading</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                                <span>{uploadsArray.filter(u => u.state.status === 'queued').length} queued</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                <span>{uploadsArray.filter(u => u.state.status === 'paused').length} paused</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload List */}
                <div className="space-y-4">
                    {uploadsArray.map((upload) => (
                        <div
                            key={upload.id}
                            className="bg-white rounded-lg shadow p-4 transition-all hover:shadow-md"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0 flex items-start gap-3">
                                    {/* File icon */}
                                    <div className="mt-1">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium truncate">{upload.progress.fileName}</h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatBytes(upload.progress.uploadedBytes)} / {formatBytes(upload.progress.totalBytes)}
                                            {upload.progress.speed > 0 && (
                                                <> • {formatSpeed(upload.progress.speed)}</>
                                            )}
                                            {upload.progress.eta > 0 && upload.state.status === 'uploading' && (
                                                <> • {formatTime(upload.progress.eta)} remaining</>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <span className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${getStatusColor(upload.state.status)} text-white`}>
                                        {getStatusIcon(upload.state.status)}
                                        <span className="capitalize">{upload.state.status}</span>
                                    </span>

                                    {(upload.state.status === 'uploading' || upload.state.status === 'starting' || upload.state.status === 'queued') && (
                                        <button
                                            onClick={() => handlePause(upload.id)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                            title="Pause"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M5 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4zm6 0a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                            </svg>
                                        </button>
                                    )}

                                    {upload.state.status === 'paused' && (
                                        <button
                                            onClick={() => handleResume(upload.id)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                            title="Resume"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                            </svg>
                                        </button>
                                    )}

                                    {upload.state.status !== 'completed' && (
                                        <button
                                            onClick={() => handleCancel(upload.id)}
                                            className="p-1 hover:bg-gray-100 rounded text-red-600 transition-colors"
                                            title="Cancel"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(upload.state.status)}`}
                                    style={{ width: `${upload.progress.percentage}%` }}
                                />
                            </div>

                            {/* Retry Info */}
                            {Object.keys(upload.state.retries).length > 0 && (
                                <p className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Retrying chunks: {Object.entries(upload.state.retries).map(([part, count]) => `#${part}(${count})`).join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {uploadsArray.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-lg font-medium mb-1">No uploads yet</p>
                        <p className="text-sm">Drop files or click browse to get started</p>
                    </div>
                )}
            </div>

            {/* File Re-selection Prompt Modal */}
            <FileReselectionPrompt />
        </>
    );
}