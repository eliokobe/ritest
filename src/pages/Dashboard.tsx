import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Phone, Calendar } from 'lucide-react';
import { DashboardStats } from '../types';
import { airtableService } from '../services/airtable';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await airtableService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0059F1]"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Error al cargar las estadísticas</p>
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'Llamadas (30 días)',
      value: stats.calls30Days,
      icon: Phone,
      color: 'bg-blue-500',
    },
    {
      title: 'Llamadas (7 días)',
      value: stats.calls7Days,
      icon: Phone,
      color: 'bg-green-500',
    },
    {
      title: 'Citas (30 días)',
      value: stats.appointments30Days,
      icon: Calendar,
      color: 'bg-purple-500',
    },
    {
      title: 'Citas (7 días)',
      value: stats.appointments7Days,
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Resumen de actividad de tu clínica</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de barras */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Actividad Semanal (Barras)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { weekday: 'short' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              />
              <Bar dataKey="calls" fill="#0059F1" name="Llamadas" />
              <Bar dataKey="appointments" fill="#10B981" name="Citas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de líneas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tendencia Semanal (Líneas)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { weekday: 'short' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              />
              <Line 
                type="monotone" 
                dataKey="calls" 
                stroke="#0059F1" 
                strokeWidth={3}
                name="Llamadas"
                dot={{ fill: '#0059F1', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="appointments" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Citas"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;