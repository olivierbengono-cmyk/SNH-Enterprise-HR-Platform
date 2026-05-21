import React, { useState, useEffect, useRef } from 'react';
import { Plus, MessageCircle, Send, Sparkles, X, Lock, Users, TrendingUp, Lightbulb } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface Thread {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'closed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
  message_count?: number;
  latest_analysis?: Analysis;
}

interface Message {
  id: string;
  thread_id: string;
  author_id: string;
  message: string;
  is_anonymous: boolean;
  created_at: string;
  author?: {
    first_name: string;
    last_name: string;
  };
}

interface Analysis {
  id: string;
  thread_id: string;
  summary: string;
  key_themes: string[];
  sentiment: string;
  proposed_actions: string[];
  qvct_topics: string[];
  generated_at: string;
  generator?: {
    first_name: string;
    last_name: string;
  };
}

const categories = [
  { value: 'conditions_travail', label: 'Conditions de travail', color: 'blue' },
  { value: 'relations', label: 'Relations professionnelles', color: 'green' },
  { value: 'organisation', label: 'Organisation du travail', color: 'purple' },
  { value: 'sante', label: 'Santé et bien-être', color: 'red' },
  { value: 'autre', label: 'Autre', color: 'gray' },
];

interface QVCTDiscussionsProps {
  initialThreadId?: string | null;
}

export default function QVCTDiscussions({ initialThreadId }: QVCTDiscussionsProps = {}) {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [analyzingThread, setAnalyzingThread] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [threadForm, setThreadForm] = useState({
    title: '',
    description: '',
    category: 'conditions_travail',
  });

  const isHR = profile?.role === 'drh' || profile?.role === 'qvct_manager' || profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadThreads();
    loadCurrentEmployee();
  }, []);

  useEffect(() => {
    if (initialThreadId && threads.length > 0) {
      const target = threads.find((t) => t.id === initialThreadId);
      if (target) setSelectedThread(target);
    }
  }, [initialThreadId, threads]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages();
      loadLatestAnalysis();
    }
  }, [selectedThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCurrentEmployee = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCurrentEmployee(data);
      return;
    }

    if (profile) {
      const fallbackNumber = 'SNH-' + (profile.role || 'usr').toUpperCase().slice(0, 3) + '-' + user.id.replace(/-/g, '').slice(0, 8);
      const { data: created, error: createError } = await supabase
        .from('employees')
        .insert({
          user_id: user.id,
          employee_number: fallbackNumber,
          first_name: profile.first_name || 'Utilisateur',
          last_name: profile.last_name || profile.role || '',
          email: profile.email || user.email || '',
          hire_date: new Date().toISOString().slice(0, 10),
          employment_status: 'active',
          contract_type: 'CDI',
        })
        .select()
        .maybeSingle();

      if (!createError && created) {
        setCurrentEmployee(created);
      } else if (createError) {
        console.error('Unable to auto-create employee record:', createError);
      }
    }
  };

  const loadThreads = async () => {
    setLoading(true);

    const { data: threadsData, error } = await supabase
      .from('qvct_discussion_threads')
      .select(`
        *,
        creator:employees!qvct_discussion_threads_created_by_fkey(first_name, last_name)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading threads:', error);
    } else {
      const threadsWithCounts = await Promise.all(
        (threadsData || []).map(async (thread) => {
          const { count } = await supabase
            .from('qvct_discussion_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);

          return { ...thread, message_count: count || 0 };
        })
      );

      setThreads(threadsWithCounts);
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedThread) return;

    const { data, error } = await supabase
      .from('qvct_discussion_messages')
      .select(`
        *,
        author:employees!qvct_discussion_messages_author_id_fkey(first_name, last_name)
      `)
      .eq('thread_id', selectedThread.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const loadLatestAnalysis = async () => {
    if (!selectedThread) return;

    const { data, error } = await supabase
      .from('qvct_discussion_analysis')
      .select(`
        *,
        generator:employees!qvct_discussion_analysis_generated_by_fkey(first_name, last_name)
      `)
      .eq('thread_id', selectedThread.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setLatestAnalysis(data);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmployee) return;

    const { error } = await supabase
      .from('qvct_discussion_threads')
      .insert({
        ...threadForm,
        created_by: currentEmployee.id,
      });

    if (error) {
      alert('Erreur lors de la création de la discussion');
      console.error(error);
      return;
    }

    setThreadForm({ title: '', description: '', category: 'conditions_travail' });
    setShowNewThreadModal(false);
    loadThreads();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    setSendError(null);

    const trimmed = newMessage.trim();
    if (!trimmed) {
      setSendError('Le message ne peut pas etre vide');
      return;
    }
    if (!selectedThread) {
      setSendError('Aucune discussion selectionnee');
      return;
    }

    setSendingMessage(true);

    try {
      let employee = currentEmployee;
      if (!employee) {
        await loadCurrentEmployee();
        const { data: refreshed } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle();
        employee = refreshed;
      }

      if (!employee) {
        setSendError("Impossible d'identifier votre profil employe. Veuillez rafraichir la page ou contacter un administrateur.");
        return;
      }

      const { error } = await supabase
        .from('qvct_discussion_messages')
        .insert({
          thread_id: selectedThread.id,
          author_id: employee.id,
          message: trimmed,
          is_anonymous: isAnonymous,
        });

      if (error) {
        console.error('Error inserting message:', error);
        setSendError(error.message || "Erreur lors de l'envoi du message");
        return;
      }

      setNewMessage('');
      setIsAnonymous(false);
      await loadMessages();
      await loadThreads();
    } catch (err: any) {
      console.error('Unexpected error sending message:', err);
      setSendError(err?.message || "Erreur inattendue lors de l'envoi");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAnalyzeThread = async () => {
    if (!selectedThread || !currentEmployee) return;

    setAnalyzingThread(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-qvct-discussion', {
        body: {
          threadId: selectedThread.id,
          employeeId: currentEmployee.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        setLatestAnalysis(data.analysis);
        setShowAnalysisModal(true);
        loadThreads();
      } else {
        alert(data.message || 'Erreur lors de l\'analyse');
      }
    } catch (error) {
      console.error('Error analyzing thread:', error);
      alert('Erreur lors de l\'analyse de la discussion');
    } finally {
      setAnalyzingThread(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = categories.find(c => c.value === category);
    if (!cat) return null;

    const colorClasses: any = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[cat.color]}`}>
        {cat.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };

    const labels = {
      open: 'Ouvert',
      closed: 'Fermé',
      archived: 'Archivé',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      <div className="w-1/3 bg-white border border-gray-200 rounded-lg flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Discussions</h3>
          <button
            onClick={() => setShowNewThreadModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus size={16} />
            Nouvelle
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-sm">Aucune discussion</p>
            </div>
          ) : (
            <div className="divide-y">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedThread?.id === thread.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm flex-1">{thread.title}</h4>
                    {getStatusBadge(thread.status)}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryBadge(thread.category)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{thread.message_count || 0} message(s)</span>
                    <span>{new Date(thread.updated_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg flex flex-col">
        {selectedThread ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedThread.title}</h2>
                  {selectedThread.description && (
                    <p className="text-sm text-gray-600 mb-3">{selectedThread.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(selectedThread.category)}
                    {getStatusBadge(selectedThread.status)}
                  </div>
                </div>

                {isHR && selectedThread.status === 'open' && (
                  <button
                    onClick={handleAnalyzeThread}
                    disabled={analyzingThread}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles size={18} />
                    {analyzingThread ? 'Analyse en cours...' : 'Analyser avec IA'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.author_id === currentEmployee?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.author_id === currentEmployee?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {!msg.is_anonymous && msg.author && (
                      <p className={`text-xs font-medium mb-1 ${
                        msg.author_id === currentEmployee?.id ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        {msg.author.first_name} {msg.author.last_name}
                      </p>
                    )}
                    {msg.is_anonymous && (
                      <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${
                        msg.author_id === currentEmployee?.id ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        <Lock size={12} />
                        Message anonyme
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.author_id === currentEmployee?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selectedThread.status === 'open' && (
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="anonymous" className="text-sm text-gray-700 flex items-center gap-1">
                    <Lock size={14} />
                    Message anonyme
                  </label>
                </div>

                {sendError && (
                  <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {sendError}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); if (sendError) setSendError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                    placeholder="Votre message... (Ctrl+Entree pour envoyer)"
                    rows={3}
                    disabled={sendingMessage}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed h-fit flex items-center justify-center min-w-[44px]"
                  >
                    {sendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Sélectionnez une discussion pour commencer</p>
            </div>
          </div>
        )}
      </div>

      {showNewThreadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Nouvelle Discussion</h2>
              <button
                onClick={() => setShowNewThreadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  value={threadForm.category}
                  onChange={(e) => setThreadForm({ ...threadForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la discussion
                </label>
                <input
                  type="text"
                  value={threadForm.title}
                  onChange={(e) => setThreadForm({ ...threadForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Amélioration de l'espace de travail"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={threadForm.description}
                  onChange={(e) => setThreadForm({ ...threadForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez le sujet de la discussion..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Créer la discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAnalysisModal && latestAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-purple-600" />
                Analyse IA de la Discussion
              </h2>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Users size={18} className="text-purple-600" />
                  Résumé de la discussion
                </h3>
                <p className="text-gray-700">{latestAnalysis.summary}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-600" />
                  Thèmes principaux identifiés
                </h3>
                <div className="flex flex-wrap gap-2">
                  {latestAnalysis.key_themes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {latestAnalysis.qvct_topics && latestAnalysis.qvct_topics.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award size={18} className="text-green-600" />
                    Sujets QVCT concernés
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {latestAnalysis.qvct_topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {latestAnalysis.proposed_actions && latestAnalysis.proposed_actions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Lightbulb size={18} className="text-yellow-600" />
                    Actions suggérées
                  </h3>
                  <ul className="space-y-2">
                    {latestAnalysis.proposed_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span className="text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-4 border-t">
                Analyse générée le {new Date(latestAnalysis.generated_at).toLocaleString('fr-FR')}
                {latestAnalysis.generator && (
                  <span> par {latestAnalysis.generator.first_name} {latestAnalysis.generator.last_name}</span>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
