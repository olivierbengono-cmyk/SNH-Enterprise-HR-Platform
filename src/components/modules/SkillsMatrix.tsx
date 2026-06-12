import React, { useState, useEffect } from 'react';
import { Pagination, paginate, PageSize } from '../shared/Pagination';
import { Award, Plus, TrendingUp, Target, Star, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Skill {
  id: string;
  skill_name: string;
  skill_level: number;
  acquired_date: string;
  certification_url?: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position?: { title: string };
  department?: { name: string };
}

interface SkillCategory {
  name: string;
  skills: string[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: 'Compétences Techniques',
    skills: ['Programming', 'Database Management', 'Network Administration', 'Cloud Computing', 'DevOps', 'Cybersecurity']
  },
  {
    name: 'Gestion de Projet',
    skills: ['Agile/Scrum', 'Project Management', 'Risk Management', 'Budget Management', 'Stakeholder Management']
  },
  {
    name: 'Leadership',
    skills: ['Team Management', 'Strategic Planning', 'Change Management', 'Coaching & Mentoring', 'Decision Making']
  },
  {
    name: 'Communication',
    skills: ['Public Speaking', 'Negotiation', 'Technical Writing', 'Presentation', 'Conflict Resolution']
  },
  {
    name: 'Analyse',
    skills: ['Data Analysis', 'Business Intelligence', 'Statistical Analysis', 'Problem Solving', 'Critical Thinking']
  }
];

export default function SkillsMatrix() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [skillsPage, setSkillsPage] = useState(1);
  const [skillsPageSize, setSkillsPageSize] = useState<PageSize>(20);

  const [formData, setFormData] = useState({
    employee_id: '',
    skill_name: '',
    skill_level: 3,
    acquired_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: skillsData } = await supabase
        .from('employee_skills')
        .select(`
          *,
          employee:employees(first_name, last_name)
        `)
        .order('acquired_date', { ascending: false });

      const { data: employeesData } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          position:positions(title),
          department:departments(name)
        `)
        .eq('employment_status', 'active')
        .order('first_name');

      setSkills(skillsData || []);
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async () => {
    try {
      const { error } = await supabase
        .from('employee_skills')
        .insert({
          employee_id: formData.employee_id,
          skill_name: formData.skill_name,
          skill_level: formData.skill_level,
          acquired_date: formData.acquired_date
        });

      if (error) throw error;

      setShowAddSkill(false);
      setFormData({
        employee_id: '',
        skill_name: '',
        skill_level: 3,
        acquired_date: new Date().toISOString().split('T')[0]
      });
      alert('Compétence ajoutée avec succès !');
      loadData();
    } catch (error: any) {
      alert('Erreur lors de l\'ajout : ' + error.message);
    }
  };

  const getSkillsByCategory = () => {
    const categoryMap = new Map<string, Skill[]>();

    SKILL_CATEGORIES.forEach(cat => {
      categoryMap.set(cat.name, []);
    });
    categoryMap.set('Autres', []);

    skills.forEach(skill => {
      let found = false;
      for (const cat of SKILL_CATEGORIES) {
        if (cat.skills.some(s => skill.skill_name.toLowerCase().includes(s.toLowerCase()))) {
          categoryMap.get(cat.name)!.push(skill);
          found = true;
          break;
        }
      }
      if (!found) {
        categoryMap.get('Autres')!.push(skill);
      }
    });

    return categoryMap;
  };

  const getEmployeeSkills = (employeeId: string) => {
    return skills.filter(s => s.employee_id === employeeId);
  };

  const getAverageSkillLevel = () => {
    if (skills.length === 0) return 0;
    return (skills.reduce((sum, s) => sum + s.skill_level, 0) / skills.length).toFixed(1);
  };

  const getSkillDistribution = () => {
    const dist = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    skills.forEach(s => {
      if (s.skill_level === 1) dist.beginner++;
      else if (s.skill_level === 2) dist.intermediate++;
      else if (s.skill_level === 3) dist.advanced++;
      else dist.expert++;
    });
    return dist;
  };

  const getSkillLevelLabel = (level: number) => {
    const labels = {
      1: { text: 'Débutant', color: 'text-gray-600', bg: 'bg-gray-100' },
      2: { text: 'Intermédiaire', color: 'text-blue-600', bg: 'bg-blue-100' },
      3: { text: 'Avancé', color: 'text-green-600', bg: 'bg-green-100' },
      4: { text: 'Expert', color: 'text-purple-600', bg: 'bg-purple-100' }
    };
    return labels[level as keyof typeof labels] || labels[1];
  };

  const filteredSkills = skills.filter(skill => {
    if (selectedEmployee !== 'all' && skill.employee_id !== selectedEmployee) return false;
    if (selectedCategory === 'all') return true;

    const category = SKILL_CATEGORIES.find(c => c.name === selectedCategory);
    if (!category) return selectedCategory === 'Autres';

    return category.skills.some(s => skill.skill_name.toLowerCase().includes(s.toLowerCase()));
  });

  const dist = getSkillDistribution();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Matrice des Compétences</h2>
          <p className="text-gray-600">Gestion et suivi des compétences des employés</p>
        </div>
        <button
          onClick={() => setShowAddSkill(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Ajouter une compétence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Compétences</p>
              <p className="text-2xl font-bold text-gray-900">{skills.length}</p>
            </div>
            <Award className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Niveau Moyen</p>
              <p className="text-2xl font-bold text-green-900">{getAverageSkillLevel()}/4</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Experts</p>
              <p className="text-2xl font-bold text-purple-900">{dist.expert}</p>
            </div>
            <Star className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Catégories</p>
              <p className="text-2xl font-bold text-gray-900">{SKILL_CATEGORIES.length}</p>
            </div>
            <Target className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des Niveaux</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{dist.beginner}</div>
            <div className="text-sm text-gray-500">Débutants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{dist.intermediate}</div>
            <div className="text-sm text-gray-500">Intermédiaires</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{dist.advanced}</div>
            <div className="text-sm text-gray-500">Avancés</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{dist.expert}</div>
            <div className="text-sm text-gray-500">Experts</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                {SKILL_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
                <option value="Autres">Autres</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Employé</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les employés</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compétence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Niveau
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'acquisition
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Aucune compétence trouvée
                  </td>
                </tr>
              ) : (
                paginate(filteredSkills, skillsPage, skillsPageSize).map((skill) => {
                  const levelInfo = getSkillLevelLabel(skill.skill_level);
                  return (
                    <tr key={skill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {skill.employee?.first_name} {skill.employee?.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{skill.skill_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${levelInfo.bg} ${levelInfo.color}`}>
                          <Star className="h-3 w-3" />
                          {levelInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(skill.acquired_date).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination
            total={filteredSkills.length}
            page={skillsPage}
            pageSize={skillsPageSize}
            onPage={setSkillsPage}
            onPageSize={setSkillsPageSize}
          />
        </div>
      </div>

      {showAddSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter une compétence</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employé</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un employé</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.position?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compétence</label>
                <input
                  type="text"
                  value={formData.skill_name}
                  onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Project Management"
                  list="skills-list"
                />
                <datalist id="skills-list">
                  {SKILL_CATEGORIES.flatMap(cat => cat.skills).map(skill => (
                    <option key={skill} value={skill} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveau: {getSkillLevelLabel(formData.skill_level).text}
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={formData.skill_level}
                  onChange={(e) => setFormData({ ...formData, skill_level: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Débutant</span>
                  <span>Intermédiaire</span>
                  <span>Avancé</span>
                  <span>Expert</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date d'acquisition</label>
                <input
                  type="date"
                  value={formData.acquired_date}
                  onChange={(e) => setFormData({ ...formData, acquired_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddSkill(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={addSkill}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
