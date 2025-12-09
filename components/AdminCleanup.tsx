// components/AdminCleanup.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface MultipartUpload {
    key: string;
    uploadId: string;
    initiated: string;
    initiator?: string;
}

interface UploadStats {
    total: number;
    byAge: {
        lessThan1Hour: number;
        lessThan24Hours: number;
        lessThan7Days: number;
        moreThan7Days: number;
    };
    oldestUpload?: string;
}

interface CleanupResult {
    total: number;
    aborted: number;
    failed: number;
    errors: Array<{ key: string; uploadId: string; error: string }>;
}

export default function AdminCleanup() {
    const [stats, setStats] = useState<UploadStats | null>(null);
    const [uploads, setUploads] = useState<MultipartUpload[]>([]);
    const [loading, setLoading] = useState(false);
    const [cleanupLoading, setCleanupLoading] = useState(false);
    const [result, setResult] = useState<CleanupResult | null>(null);
    const [filter, setFilter] = useState({
        prefix: '',
        olderThanHours: 24,
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/upload/cleanup/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUploads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.prefix) params.append('prefix', filter.prefix);
            params.append('maxResults', '100');

            const response = await fetch(`/api/upload/cleanup/list?${params}`);
            if (response.ok) {
                const data = await response.json();
                setUploads(data.uploads || []);
            }
        } catch (error) {
            console.error('Failed to load uploads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCleanupAll = async () => {
        if (!confirm('Are you sure you want to abort all incomplete multipart uploads?')) {
            return;
        }

        setCleanupLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/upload/cleanup/abort-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prefix: filter.prefix || undefined,
                    olderThanHours: filter.olderThanHours,
                    confirm: true,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data.result);
                // Reload stats and uploads
                await loadStats();
                await loadUploads();
            } else {
                const error = await response.json();
                alert(`Cleanup failed: ${error.message}`);
            }
        } catch (error) {
            console.error('Cleanup failed:', error);
            alert('Cleanup failed. Check console for details.');
        } finally {
            setCleanupLoading(false);
        }
    };

    const handleAbortSingle = async (key: string, uploadId: string) => {
        if (!confirm(`Abort upload for ${key}?`)) {
            return;
        }

        try {
            const response = await fetch('/api/upload/cleanup/abort-single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, uploadId }),
            });

            if (response.ok) {
                alert('Upload aborted successfully');
                await loadUploads();
                await loadStats();
            } else {
                const error = await response.json();
                alert(`Failed to abort: ${error.message}`);
            }
        } catch (error) {
            console.error('Failed to abort:', error);
            alert('Failed to abort upload');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getAgeColor = (dateString: string) => {
        const ageHours = (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60);
        if (ageHours < 1) return 'text-green-600';
        if (ageHours < 24) return 'text-yellow-600';
        if (ageHours < 168) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Multipart Upload Cleanup</h1>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 mb-1">Total Incomplete</div>
                    <div className="text-3xl font-bold">{stats?.total || 0}</div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 mb-1">Less than 1 hour</div>
                    <div className="text-3xl font-bold text-green-600">
                        {stats?.byAge.lessThan1Hour || 0}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 mb-1">1-24 hours</div>
                    <div className="text-3xl font-bold text-yellow-600">
                        {stats?.byAge.lessThan24Hours || 0}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500 mb-1">More than 7 days</div>
                    <div className="text-3xl font-bold text-red-600">
                        {stats?.byAge.moreThan7Days || 0}
                    </div>
                </div>
            </div>

            {stats?.oldestUpload && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <div className="text-sm font-medium text-amber-800">
                                Oldest incomplete upload
                            </div>
                            <div className="text-sm text-amber-700">
                                Started {formatDate(stats.oldestUpload)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cleanup Controls */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Cleanup Settings</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prefix Filter (optional)
                        </label>
                        <input
                            type="text"
                            value={filter.prefix}
                            onChange={(e) => setFilter({ ...filter, prefix: e.target.value })}
                            placeholder="e.g., users/123"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Only clean uploads matching this prefix
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Older Than (hours)
                        </label>
                        <input
                            type="number"
                            value={filter.olderThanHours}
                            onChange={(e) => setFilter({ ...filter, olderThanHours: parseInt(e.target.value) })}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Only clean uploads older than this
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={loadUploads}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Loading...' : 'List Uploads'}
                    </button>

                    <button
                        onClick={handleCleanupAll}
                        disabled={cleanupLoading || (stats?.total || 0) === 0}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cleanupLoading ? 'Cleaning...' : 'Cleanup All Matching'}
                    </button>

                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Refresh Stats
                    </button>
                </div>
            </div>

            {/* Cleanup Result */}
            {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">Cleanup Result</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Total:</span>{' '}
                            <span className="font-medium">{result.total}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Aborted:</span>{' '}
                            <span className="font-medium text-green-600">{result.aborted}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Failed:</span>{' '}
                            <span className="font-medium text-red-600">{result.failed}</span>
                        </div>
                    </div>
                    {result.errors.length > 0 && (
                        <details className="mt-3">
                            <summary className="text-sm text-red-600 cursor-pointer">
                                View errors ({result.errors.length})
                            </summary>
                            <div className="mt-2 space-y-1">
                                {result.errors.map((err, idx) => (
                                    <div key={idx} className="text-xs text-red-700">
                                        {err.key}: {err.error}
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            )}

            {/* Upload List */}
            {uploads.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold">Incomplete Uploads ({uploads.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Key
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Upload ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Initiated
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {uploads.map((upload) => (
                                    <tr key={upload.uploadId}>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                                            {upload.key}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                            {upload.uploadId.substring(0, 20)}...
                                        </td>
                                        <td className={`px-6 py-4 text-sm ${getAgeColor(upload.initiated)}`}>
                                            {formatDate(upload.initiated)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <button
                                                onClick={() => handleAbortSingle(upload.key, upload.uploadId)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Abort
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {uploads.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium mb-1">No incomplete uploads</p>
                    <p className="text-sm">Click "List Uploads" to check for incomplete uploads</p>
                </div>
            )}
        </div>
    );
}