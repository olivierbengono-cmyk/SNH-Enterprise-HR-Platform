import { useState, useEffect } from 'react';
import {
  Megaphone, Heart, Calendar, Lightbulb, BarChart3,
  Gift, AlertTriangle, Plus, X, ThumbsUp, Users,
  TrendingUp, Award, MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import QVCTDiscussions from './qvct/QVCTDiscussions';

interface Stats {
  activeAnnouncements: number;
  upcomingEvents: number;
  openSuggestions: number;
  satisfactionScore: number;
  activeSurveys: number;
  eventParticipation: number;
}

export default function QVCTManagement() {
  const [activeTab, setActiveTab] = useState<'overview' | 'communication' | 'events' | 'suggestions' | 'surveys' | 'benefits' | 'health' | 'discussions'>('overview');
  const [stats, setStats] = useState<Stats>({
    activeAnnouncements: 0,
    upcomingEvents: 0,
    openSuggestions: 0,
    satisfactionScore: 0,
    activeSurveys: 0,
    eventParticipation: 0,
  });
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        announcementsRes,
        eventsRes,
        suggestionsRes,
        surveysRes,
        benefitsRes,
        incidentsRes,
        responsesRes,
        participantsRes,
      ] = await Promise.all([
        supabase.from('qvct_announcements').select('*').eq('is_active', true).order('published_at', { ascending: false }),
        supabase.from('qvct_events').select('*').order('start_date', { ascending: false }),
        supabase.from('qvct_suggestions').select('*').order('created_at', { ascending: false }),
        supabase.from('qvct_surveys').select('*').order('created_at', { ascending: false }),
        supabase.from('qvct_benefits').select('*').eq('is_active', true),
        supabase.from('qvct_health_incidents').select('*').order('incident_date', { ascending: false }),
        supabase.from('qvct_survey_responses').select('satisfaction_score'),
        supabase.from('qvct_event_participants').select('id'),
      ]);

      setAnnouncements(announcementsRes.data || []);
      setEvents(eventsRes.data || []);
      setSuggestions(suggestionsRes.data || []);
      setSurveys(surveysRes.data || []);
      setBenefits(benefitsRes.data || []);
      setIncidents(incidentsRes.data || []);

      const avgSatisfaction = responsesRes.data?.reduce((sum, r) => sum + (parseFloat(r.satisfaction_score) || 0), 0) / (responsesRes.data?.length || 1);
      const upcomingEventsCount = eventsRes.data?.filter(e => e.status === 'planned').length || 0;
      const openSuggestionsCount = suggestionsRes.data?.filter(s => s.status === 'submitted' || s.status === 'under_review').length || 0;

      setStats({
        activeAnnouncements: announcementsRes.data?.length || 0,
        upcomingEvents: upcomingEventsCount,
        openSuggestions: openSuggestionsCount,
        satisfactionScore: avgSatisfaction || 0,
        activeSurveys: surveysRes.data?.filter(s => s.status === 'active').length || 0,
        eventParticipation: participantsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading QVCT data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: 'Général',
      policy: 'Politique',
      event: 'Événement',
      training: 'Formation',
      wellbeing: 'Bien-être',
      improvement: 'Amélioration',
      social: 'Social',
      innovation: 'Innovation',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      submitted: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      under_review: { bg: 'bg-blue-100', text: 'text-blue-800' },
      approved: { bg: 'bg-green-100', text: 'text-green-800' },
      implemented: { bg: 'bg-purple-100', text: 'text-purple-800' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800' },
      active: { bg: 'bg-green-100', text: 'text-green-800' },
      planned: { bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800' },
      reported: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      under_investigation: { bg: 'bg-blue-100', text: 'text-blue-800' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Qualité de Vie et Conditions de Travail</h2>
          <p className="text-gray-600 mt-1">Gestion du bien-être et de l'engagement des collaborateurs</p>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Annonces Actives</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeAnnouncements}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Megaphone className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Événements à venir</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingEvents}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Suggestions Ouvertes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.openSuggestions}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Lightbulb className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.satisfactionScore.toFixed(1)}/5</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Heart className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Dernières Annonces</h3>
                <button onClick={() => setActiveTab('communication')} className="text-blue-600 text-sm hover:underline">
                  Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {announcements.slice(0, 3).map(announcement => (
                  <div key={announcement.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{formatDate(announcement.published_at)}</span>
                          {getCategoryLabel(announcement.category) && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{getCategoryLabel(announcement.category)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Prochains Événements</h3>
                <button onClick={() => setActiveTab('events')} className="text-blue-600 text-sm hover:underline">
                  Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {events.filter(e => e.status === 'planned').slice(0, 3).map(event => (
                  <div key={event.id} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-500">{formatDate(event.start_date)}</span>
                          {event.participants_count > 0 && (
                            <>
                              <Users className="h-4 w-4 text-gray-400 ml-2" />
                              <span className="text-xs text-gray-500">{event.participants_count} inscrits</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Suggestions Populaires</h3>
                <button onClick={() => setActiveTab('suggestions')} className="text-blue-600 text-sm hover:underline">
                  Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {suggestions.slice(0, 3).map(suggestion => (
                  <div key={suggestion.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                          {getStatusBadge(suggestion.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{suggestion.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{getCategoryLabel(suggestion.category)}</span>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{suggestion.votes_count} votes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Enquêtes en Cours</h3>
                <button onClick={() => setActiveTab('surveys')} className="text-blue-600 text-sm hover:underline">
                  Voir tout
                </button>
              </div>
              <div className="space-y-4">
                {surveys.filter(s => s.status === 'active').map(survey => (
                  <div key={survey.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{survey.title}</h4>
                        <p className="text-sm text-gray-600 mt-2">{survey.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <BarChart3 className="h-4 w-4" />
                            <span>{survey.response_count} réponses</span>
                          </div>
                          <span className="text-xs text-gray-500">Jusqu'au {formatDate(survey.end_date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'communication' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Communication Interne</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle annonce
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {announcements.map(announcement => (
                <div key={announcement.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-semibold text-gray-900">{announcement.title}</h4>
                        {announcement.priority === 'high' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">Priorité haute</span>
                        )}
                      </div>
                      <p className="text-gray-700 mt-3">{announcement.content}</p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-sm text-gray-500">{formatDate(announcement.published_at)}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{getCategoryLabel(announcement.category)}</span>
                        <span className="text-sm text-gray-500">{announcement.views_count || 0} vues</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Événements d'Entreprise</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvel événement
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map(event => (
                <div key={event.id} className="border rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{event.title}</h4>
                          {getStatusBadge(event.status)}
                        </div>
                        <p className="text-gray-700">{event.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">📍</span>
                        <span>{event.location}</span>
                      </div>
                      {event.participants_count > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{event.participants_count} participants</span>
                          {event.max_participants && <span className="text-gray-400">/ {event.max_participants}</span>}
                        </div>
                      )}
                      {event.budget && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">💰</span>
                          <span>Budget: {formatCurrency(event.budget)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Boîte à Idées</h3>
            <p className="text-sm text-gray-600 mt-1">Suggestions et idées d'amélioration des collaborateurs</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {suggestions.map(suggestion => (
                <div key={suggestion.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">{suggestion.title}</h4>
                        {getStatusBadge(suggestion.status)}
                      </div>
                      <p className="text-gray-700">{suggestion.description}</p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{getCategoryLabel(suggestion.category)}</span>
                        <div className="flex items-center gap-1">
                          <button className="flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50">
                            <ThumbsUp className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{suggestion.votes_count}</span>
                          </button>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(suggestion.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'surveys' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Enquêtes de Satisfaction</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle enquête
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {surveys.map(survey => (
                <div key={survey.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{survey.title}</h4>
                        {getStatusBadge(survey.status)}
                      </div>
                      <p className="text-gray-700">{survey.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Réponses</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{survey.response_count}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Début</span>
                      </div>
                      <p className="text-sm text-gray-900 mt-2">{formatDate(survey.start_date)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">Fin</span>
                      </div>
                      <p className="text-sm text-gray-900 mt-2">{formatDate(survey.end_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'benefits' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Avantages Sociaux</h3>
            <p className="text-sm text-gray-600 mt-1">Catalogue des avantages proposés aux collaborateurs</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map(benefit => (
                <div key={benefit.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Gift className="h-6 w-6 text-blue-600" />
                        <h4 className="text-lg font-semibold text-gray-900">{benefit.name}</h4>
                      </div>
                      <p className="text-gray-700 mt-2">{benefit.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-600">Valeur mensuelle</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(benefit.value)}</p>
                    </div>
                    <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full">{benefit.benefit_type}</span>
                  </div>
                  {benefit.eligibility_criteria && (
                    <p className="text-xs text-gray-500 mt-3">Éligibilité: {benefit.eligibility_criteria}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Santé et Sécurité au Travail</h3>
            <p className="text-sm text-gray-600 mt-1">Suivi des incidents et actions préventives</p>
          </div>
          <div className="p-6">
            {incidents.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun incident enregistré</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map(incident => (
                  <div key={incident.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className={`h-5 w-5 ${incident.severity === 'high' ? 'text-red-600' : incident.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'}`} />
                          <h4 className="font-semibold text-gray-900">{incident.incident_type.replace(/_/g, ' ')}</h4>
                          {getStatusBadge(incident.status)}
                        </div>
                        <p className="text-gray-700">{incident.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-gray-600">Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(incident.incident_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Lieu</p>
                        <p className="text-sm font-medium text-gray-900">{incident.location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Gravité</p>
                        <span className={`text-sm font-medium ${incident.severity === 'high' ? 'text-red-600' : incident.severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Jours d'arrêt</p>
                        <p className="text-sm font-medium text-gray-900">{incident.days_lost || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('communication')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'communication' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Communication
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'events' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Événements
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'suggestions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Boîte à idées
            </button>
            <button
              onClick={() => setActiveTab('surveys')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'surveys' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Enquêtes
            </button>
            <button
              onClick={() => setActiveTab('benefits')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'benefits' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Avantages
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'health' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Santé & Sécurité
            </button>
            <button
              onClick={() => setActiveTab('discussions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${activeTab === 'discussions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Discussions & Questions
            </button>
          </nav>
        </div>

        {activeTab === 'discussions' && (
          <div className="p-6">
            <QVCTDiscussions />
          </div>
        )}
      </div>
    </div>
  );
}
