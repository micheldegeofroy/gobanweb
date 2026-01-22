'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface LegalPageInfo {
  slug: string;
  title: string;
  updatedAt: string;
}

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export default function AdminLegalPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);

  const [pages, setPages] = useState<LegalPageInfo[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [isBold, setIsBold] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Fetch all pages
  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch('/api/legal');
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Load a specific page
  const loadPage = async (slug: string) => {
    try {
      const res = await fetch(`/api/legal/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSlug(slug);
        setTitle(data.title);
        setShowHtml(false);
        setHtmlContent(data.content || '');
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
        }
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error loading page:', error);
      setMessage({ type: 'error', text: 'Failed to load page' });
    }
  };

  // Save the current page
  const savePage = async () => {
    const slug = isCreating ? newSlug : selectedSlug;
    if (!slug || !title.trim()) {
      setMessage({ type: 'error', text: 'Slug and title are required' });
      return;
    }

    setIsSaving(true);
    try {
      // Use HTML textarea content if in HTML mode, otherwise use editor content
      const content = showHtml ? htmlContent : (editorRef.current?.innerHTML || '');
      const res = await fetch(`/api/legal/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Page saved successfully' });
        fetchPages();
        if (isCreating) {
          setSelectedSlug(slug);
          setIsCreating(false);
          setNewSlug('');
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to save page' });
      }
    } catch (error) {
      console.error('Error saving page:', error);
      setMessage({ type: 'error', text: 'Failed to save page' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Start creating a new page
  const startNewPage = () => {
    setIsCreating(true);
    setSelectedSlug(null);
    setTitle('');
    setNewSlug('');
    setShowHtml(false);
    setHtmlContent('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  // Apply formatting
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateToolbarState();
  };

  // Toggle bold
  const toggleBold = () => {
    applyFormat('bold');
  };

  // Undo - focus editor first to prevent browser navigation
  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('undo');
    }
  };

  // Redo - focus editor first to prevent browser navigation
  const handleRedo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('redo');
    }
  };

  // Clear document
  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.focus();
    }
  };

  // Toggle HTML view
  const toggleHtmlView = () => {
    if (showHtml) {
      // Switching from HTML to visual - apply HTML content
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
      }
      setShowHtml(false);
    } else {
      // Switching from visual to HTML - get current content
      if (editorRef.current) {
        setHtmlContent(editorRef.current.innerHTML);
      }
      setShowHtml(true);
    }
  };

  // Apply font size using execCommand for better browser handling
  const applyFontSize = (size: number) => {
    setFontSize(size);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    // Use execCommand with fontSize (1-7), then replace font tags with spans
    // This is more reliable than manually wrapping with spans
    document.execCommand('fontSize', false, '7');

    // Replace the font tags with span tags with proper pixel sizes
    if (editorRef.current) {
      const fonts = editorRef.current.querySelectorAll('font[size="7"]');
      fonts.forEach((font) => {
        const span = document.createElement('span');
        span.style.fontSize = `${size}px`;
        span.innerHTML = font.innerHTML;
        font.parentNode?.replaceChild(span, font);
      });
    }

    editorRef.current?.focus();
  };

  // Update toolbar state based on selection
  const updateToolbarState = () => {
    setIsBold(document.queryCommandState('bold'));
  };

  // Handle selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      updateToolbarState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
            Legal Pages Editor
          </h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pages List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Pages</h2>
                <button
                  onClick={startNewPage}
                  className="px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
                >
                  + New
                </button>
              </div>

              <ul className="space-y-2">
                {pages.map((page) => (
                  <li key={page.slug}>
                    <button
                      onClick={() => loadPage(page.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedSlug === page.slug && !isCreating
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="font-medium">{page.title}</div>
                      <div className="text-xs text-zinc-500">/{page.slug}</div>
                    </button>
                  </li>
                ))}
                {pages.length === 0 && (
                  <li className="text-zinc-500 dark:text-zinc-400 text-sm px-3 py-2">
                    No pages yet. Create one!
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
              {(selectedSlug || isCreating) ? (
                <>
                  {/* Page Slug */}
                  {isCreating && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        URL Slug (e.g., terms, privacy)
                      </label>
                      <input
                        type="text"
                        value={newSlug}
                        onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="terms"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Page Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Terms of Service"
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Toolbar */}
                  <div className="mb-2 flex flex-wrap items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
                    {/* Undo Button */}
                    <button
                      onClick={handleUndo}
                      className="px-3 py-1.5 rounded transition-colors bg-white dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-500"
                      title="Undo (Ctrl+Z)"
                    >
                      ↩
                    </button>

                    {/* Redo Button */}
                    <button
                      onClick={handleRedo}
                      className="px-3 py-1.5 rounded transition-colors bg-white dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-500"
                      title="Redo (Ctrl+Y)"
                    >
                      ↪
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-500" />

                    {/* Bold Button */}
                    <button
                      onClick={toggleBold}
                      className={`px-3 py-1.5 rounded font-bold transition-colors ${
                        isBold
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-500'
                      }`}
                      title="Bold (Ctrl+B)"
                    >
                      B
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-500" />

                    {/* Font Size Dropdown */}
                    <div className="flex items-center gap-1">
                      <select
                        value={fontSize}
                        onChange={(e) => applyFontSize(Number(e.target.value))}
                        className="w-16 h-8 px-2 rounded bg-white dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm cursor-pointer"
                      >
                        {FONT_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">px</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-500" />

                    {/* Clear Button */}
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 rounded transition-colors bg-white dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                      title="Clear document"
                    >
                      Clear
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-500" />

                    {/* HTML Toggle Button */}
                    <button
                      onClick={toggleHtmlView}
                      className={`px-3 py-1.5 rounded transition-colors ${
                        showHtml
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-zinc-600 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-500'
                      }`}
                      title="Toggle HTML view"
                    >
                      HTML
                    </button>
                  </div>

                  {/* Editor */}
                  {showHtml ? (
                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      className="min-h-[400px] w-full p-4 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
                      style={{ lineHeight: '1.6' }}
                      spellCheck={false}
                    />
                  ) : (
                    <div
                      ref={editorRef}
                      contentEditable
                      className="min-h-[400px] p-4 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-[family-name:var(--font-geist-sans)]"
                      onInput={updateToolbarState}
                      style={{ lineHeight: '1.6' }}
                    />
                  )}

                  {/* Save Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={savePage}
                      disabled={isSaving}
                      className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Page'}
                    </button>

                    {selectedSlug && !isCreating && (
                      <a
                        href={`/legal/${selectedSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        View Page →
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-zinc-500 dark:text-zinc-400">
                  <p className="text-lg mb-4">Select a page to edit or create a new one</p>
                  <button
                    onClick={startNewPage}
                    className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Create New Page
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
