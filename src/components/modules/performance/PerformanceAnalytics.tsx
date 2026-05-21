import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, Star, Award, BarChart3 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface AnalyticsData {
  totalObjectives: number;
  activeObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  totalReviews: number;
  averageRating: number;
  totalFeedbackCampaigns: number;
  activeDevelopmentPlans: number;
  objectivesByType: { type: string; count: number }[];
  reviewsByPeriod: { period: string; count: number }[];
  topPerformers: any[];
}

export default function PerformanceAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalObjectives: 0,
    activeObjectives: 0,
    completedObjectives: 0,
    averageProgress: 0,
    totalReviews: 0,
    averageRating: 0,
    totalFeedbackCampaigns: 0,
    activeDevelopmentPlans: 0,
    objectivesByType: [],
    reviewsByPeriod: [],
    topPerformers: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear]);

  const loadAnalytics = async () => {
    setLoading(true);

    const [
      { data: objectives },
      { data: reviews },
      { data: feedback360 },
      { data: developmentPlans },
    ] = await Promise.all([
      supabase.from('objectives').select('*, key_results(*)').eq('year', selectedYear),
      supabase.from('performance_reviews').select('*, employee:employees(first_name, last_name)').eq('review_year', selectedYear),
      supabase.from('feedback_360').select('*'),
      supabase.from('development_plans').select('*').eq('status', 'active'),
    ]);

    const totalObjectives = objectives?.length || 0;
    const activeObjectives = objectives?.filter(o => o.status === 'active').length || 0;
    const completedObjectives = objectives?.filter(o => o.status === 'completed').length || 0;

    const objectiveProgress = objectives?.map(obj => {
      if (!obj.key_results || obj.key_results.length === 0) return 0;
      const totalWeight = obj.key_results.reduce((sum: number, kr: any) => sum + kr.weight, 0);
      const weightedProgress = obj.key_results.reduce((sum: number, kr: any) => {
        const progress = Math.min((kr.current_value / kr.target_value) * 100, 100);
        return sum + (progress * kr.weight / totalWeight);
      }, 0);
      return weightedProgress;
    }) || [];

    const averageProgress = objectiveProgress.length > 0
      ? objectiveProgress.reduce((sum, p) => sum + p, 0) / objectiveProgress.length
      : 0;

    const totalReviews = reviews?.length || 0;
    const averageRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length
      : 0;

    const objectivesByType = [
      { type: 'Individuel', count: objectives?.filter(o => o.type === 'individual').length || 0 },
      { type: 'Équipe', count: objectives?.filter(o => o.type === 'team').length || 0 },
      { type: 'Entreprise', count: objectives?.filter(o => o.type === 'company').length || 0 },
    ];

    const reviewsByPeriod = ['Q1', 'Q2', 'Q3', 'Q4', 'annual'].map(period => ({
      period,
      count: reviews?.filter(r => r.review_period === period).length || 0,
    }));

    const employeeRatings = new Map<string, { employee: any; ratings: number[] }>();
    reviews?.forEach(review => {
      if (review.employee && review.overall_rating) {
        const key = `${review.employee.first_name} ${review.employee.last_name}`;
        if (!employeeRatings.has(key)) {
          employeeRatings.set(key, { employee: review.employee, ratings: [] });
        }
        employeeRatings.get(key)!.ratings.push(review.overall_rating);
      }
    });

    const topPerformers = Array.from(employeeRatings.entries())
      .map(([name, data]) => ({
        name,
        averageRating: data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length,
        reviewCount: data.ratings.length,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);

    setAnalytics({
      totalObjectives,
      activeObjectives,
      completedObjectives,
      averageProgress: Math.round(averageProgress),
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedbackCampaigns: feedback360?.length || 0,
      activeDevelopmentPlans: developmentPlans?.length || 0,
      objectivesByType,
      reviewsByPeriod,
      topPerformers,
    });

    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des analyses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Analyses de Performance</h2>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {[2024, 2025, 2026, 2027].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Target size={32} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mb-1">{analytics.totalObjectives}</p>
          <p className="text-sm opacity-90">Objectifs totaux</p>
          <div className="mt-3 text-xs">
            <span className="mr-3">✓ {analytics.activeObjectives} actifs</span>
            <span>✓ {analytics.completedObjectives} terminés</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mb-1">{analytics.averageProgress}%</p>
          <p className="text-sm opacity-90">Progression moyenne</p>
          <p className="text-xs mt-3 opacity-80">des objectifs actifs</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Star size={32} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mb-1">{analytics.averageRating}/5</p>
          <p className="text-sm opacity-90">Note moyenne</p>
          <p className="text-xs mt-3 opacity-80">{analytics.totalReviews} évaluations</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <Award size={32} className="opacity-80" />
          </div>
          <p className="text-3xl font-bold mb-1">{analytics.activeDevelopmentPlans}</p>
          <p className="text-sm opacity-90">Plans de développement</p>
          <p className="text-xs mt-3 opacity-80">en cours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={20} className="text-blue-600" />
            Objectifs par type
          </h3>
          <div className="space-y-4">
            {analytics.objectivesByType.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">{item.type}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${analytics.totalObjectives > 0 ? (item.count / analytics.totalObjectives) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-green-600" />
            Évaluations par période
          </h3>
          <div className="space-y-4">
            {analytics.reviewsByPeriod.map((item) => (
              <div key={item.period}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">{item.period}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${analytics.totalReviews > 0 ? (item.count / analytics.totalReviews) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {analytics.topPerformers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award size={20} className="text-yellow-600" />
            Top 5 Performers ({selectedYear})
          </h3>
          <div className="space-y-3">
            {analytics.topPerformers.map((performer, index) => (
              <div
                key={performer.name}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-white rounded-lg border border-yellow-100"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                    ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.name}</p>
                    <p className="text-sm text-gray-600">{performer.reviewCount} évaluation(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={20} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-xl font-bold text-gray-900">{performer.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-600">/5</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalFeedbackCampaigns}</p>
              <p className="text-sm text-gray-600">Campagnes 360°</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Feedback collaboratif</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-white rounded-lg border border-green-100 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.completedObjectives > 0
                  ? Math.round((analytics.completedObjectives / analytics.totalObjectives) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-600">Taux de réussite</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Objectifs complétés</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Award size={24} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalReviews > 0
                  ? Math.round((analytics.totalReviews / (analytics.totalObjectives || 1)) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-600">Couverture</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Évaluations réalisées</p>
        </div>
      </div>
    </div>
  );
}
