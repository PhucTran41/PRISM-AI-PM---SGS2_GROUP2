'use client';

import React, { useState, useCallback, useRef } from 'react';
import { uploadManager } from '@/lib/upload-manager';
import { UploadProgress, UploadState } from '@/services/upload/types';

interface FileUploadItem {
    id: string;
    progress: UploadProgress;
    state: UploadState;
}

export default function FileUploader() {
    const [uploads, setUploads] = useState<Map<string, FileUploadItem>>(new Map());
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        const fileArray = Array.from(files);
        const uploadIds = await uploadManager.addFiles(fileArray);

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
            uploadManager.onProgress(id, (progress) => {
                updateUpload(id, { progress });
            });

            // Subscribe to state changes
            uploadManager.onStateChange(id, (state) => {
                updateUpload(id, { state });
            });
        });
    }, [updateUpload]);

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
        uploadManager.pauseUpload(uploadId);
    }, []);

    const handleResume = useCallback((uploadId: string) => {
        uploadManager.resumeUpload(uploadId);
    }, []);

    const handleCancel = useCallback((uploadId: string) => {
        uploadManager.cancelUpload(uploadId);
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
                return 'bg-blue-500';
            default:
                return 'bg-gray-500';
        }
    };

    const uploadsArray = Array.from(uploads.values());
    const totalProgress = uploadsArray.length > 0
        ? uploadsArray.reduce((sum, u) => sum + u.progress.percentage, 0) / uploadsArray.length
        : 0;

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">File Upload</h2>

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
                        >
                            browse
                        </button>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                        Supports: Images (JPEG, PNG, WebP), Videos (MP4), Documents (PDF, DOCX, TXT)
                    </p>
                    <p className="text-xs text-gray-500">Max file size: 5GB</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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
                    <div className="mt-2 text-xs text-gray-500">
                        {uploadsArray.filter(u => u.state.status === 'completed').length} completed,{' '}
                        {uploadsArray.filter(u => u.state.status === 'uploading').length} uploading,{' '}
                        {uploadsArray.filter(u => u.state.status === 'queued').length} queued
                    </div>
                </div>
            )}

            {/* Upload List */}
            <div className="space-y-4">
                {uploadsArray.map((upload) => (
                    <div
                        key={upload.id}
                        className="bg-white rounded-lg shadow p-4"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium truncate">{upload.progress.fileName}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatBytes(upload.progress.uploadedBytes)} / {formatBytes(upload.progress.totalBytes)}
                                    {upload.progress.speed > 0 && (
                                        <> • {formatSpeed(upload.progress.speed)}</>
                                    )}
                                    {upload.progress.eta > 0 && (
                                        <> • {formatTime(upload.progress.eta)} remaining</>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                                <span className={`px-2 py-1 text-xs rounded ${getStatusColor(upload.state.status)} text-white`}>
                                    {upload.state.status}
                                </span>

                                {(upload.state.status === 'uploading' || upload.state.status === 'queued') && (
                                    <button
                                        onClick={() => handlePause(upload.id)}
                                        className="p-1 hover:bg-gray-100 rounded"
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
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Resume"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                    </button>
                                )}

                                <button
                                    onClick={() => handleCancel(upload.id)}
                                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                                    title="Cancel"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(upload.state.status)}`}
                                style={{ width: `${upload.progress.percentage}%` }}
                            />
                        </div>

                        {/* Retry Info */}
                        {Object.keys(upload.state.retries).length > 0 && (
                            <p className="mt-2 text-xs text-yellow-600">
                                Retrying chunks: {Object.entries(upload.state.retries).map(([part, count]) => `#${part}(${count})`).join(', ')}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {uploadsArray.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No uploads yet. Drop files or click browse to get started.
                </div>
            )}
        </div>
    );
}