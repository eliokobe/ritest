import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, User, Calendar } from 'lucide-react';
import { Task } from '../types';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, []);
  
  const fetchTasks = async () => {
     try {
      const data = await airtableService.getTasks(user?.clinic);
       setTasks(data);
     } catch (error) {
       console.error('Error fetching tasks:', error);
     } finally {
       setLoading(false);
     }
  };

  const updateTaskStatus = async (taskId: string, currentStatus: string) => {
    const statusFlow = {
      'pending': 'in-progress',
      'in-progress': 'completed',
      'completed': 'pending'
    };

    const newStatus = statusFlow[currentStatus as keyof typeof statusFlow];
    
    setUpdatingTask(taskId);
    try {
      await airtableService.updateTaskStatus(taskId, newStatus);
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus as Task['status'] } : task
      ));
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setUpdatingTask(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'in-progress':
        return 'En Progreso';
      default:
        return 'Pendiente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
        <p className="text-gray-600 mt-2">Gestiona las tareas de tu clínica</p>
      </div>

      <div className="grid gap-6">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay tareas disponibles</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(task.status)}
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{task.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {task.assignedTo}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(task.dueDate).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => updateTaskStatus(task.id, task.status)}
                  disabled={updatingTask === task.id}
                  className="ml-4 bg-brand-dark text-white px-5 py-2.5 rounded-full font-medium hover:bg-brand-green focus:ring-2 focus:ring-brand-dark focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updatingTask === task.id ? 'Actualizando...' : 'Actualizar Estado'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tasks;