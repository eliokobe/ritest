import React, { useEffect, useState } from 'react';
import { Wrench, Search, Phone, User, FileText, Camera, Settings, Edit3, Check, X, ChevronDown } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

interface Service {
  id: string;
  expediente?: string;
  cliente?: string;
  telefono?: string;
  estado?: string;
  comentarios?: string;
  tecnico?: string;
  fotoReparado?: string;
  reparacion?: string;
}

const STATUS_OPTIONS = [
  'Pendiente de material',
  'En reparación',
  'Sin reparar',
  'Finalizado',
  'Cancelado',
  'Sin técnico',
  'Sin contactar',
  'Contactado',
  'Pendiente respuesta',
  'Aceptado',
  'Rechazado',
  'Citado'
];

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentValue, setEditCommentValue] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await airtableService.getServices(user?.clinic);
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = (serviceId: string, currentComment: string) => {
    setEditingComment(serviceId);
    setEditCommentValue(currentComment || '');
  };

  const handleSaveComment = async (serviceId: string) => {
    if (savingComment) return;
    
    setSavingComment(true);
    try {
      await airtableService.updateServiceComments(serviceId, editCommentValue);
      
      // Actualizar el servicio en el estado local
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId 
            ? { ...service, comentarios: editCommentValue }
            : service
        )
      );
      
      setEditingComment(null);
      setEditCommentValue('');
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Error al guardar el comentario');
    } finally {
      setSavingComment(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditCommentValue('');
  };

  const handleEditStatus = (serviceId: string) => {
    setEditingStatus(serviceId);
  };

  const handleSaveStatus = async (serviceId: string, newStatus: string) => {
    if (savingStatus) return;
    
    setSavingStatus(true);
    try {
      await airtableService.updateServiceStatus(serviceId, newStatus);
      
      // Actualizar el servicio en el estado local
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId 
            ? { ...service, estado: newStatus }
            : service
        )
      );
      
      setEditingStatus(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCancelStatusEdit = () => {
    setEditingStatus(null);
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm || 
      service.expediente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.telefono?.includes(searchTerm) ||
      service.tecnico?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'finalizado':
        return 'bg-green-100 text-green-800';
      case 'en reparación':
        return 'bg-blue-100 text-blue-800';
      case 'pendiente de material':
      case 'sin reparar':
      case 'pendiente respuesta':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      case 'sin técnico':
      case 'sin contactar':
        return 'bg-gray-100 text-gray-800';
      case 'contactado':
      case 'aceptado':
      case 'citado':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
        <p className="text-gray-600 mt-2">Gestión de servicios técnicos y reparaciones</p>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por expediente, cliente, teléfono o técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de servicios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay servicios disponibles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Expediente
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Cliente
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Teléfono
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Técnico
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reparación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comentarios</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Camera className="h-4 w-4 mr-2" />
                      Foto
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service.expediente || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.cliente || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingStatus === service.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={service.estado || ''}
                            onChange={(e) => handleSaveStatus(service.id, e.target.value)}
                            disabled={savingStatus}
                            className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50"
                            autoFocus
                          >
                            <option value="">Seleccionar estado</option>
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleCancelStatusEdit}
                            disabled={savingStatus}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span 
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(service.estado)}`}
                          onClick={() => handleEditStatus(service.id)}
                          title="Click para cambiar estado"
                        >
                          {service.estado || 'Sin estado'}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.tecnico || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {service.reparacion || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingComment === service.id ? (
                        <div className="flex items-center space-x-2">
                          <textarea
                            value={editCommentValue}
                            onChange={(e) => setEditCommentValue(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-full max-w-xs resize-none"
                            rows={2}
                            placeholder="Añadir comentario..."
                            autoFocus
                          />
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleSaveComment(service.id)}
                              disabled={savingComment}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Guardar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={savingComment}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-sm text-gray-900 max-w-xs truncate cursor-pointer hover:bg-gray-100 rounded px-2 py-1 flex items-center group"
                          onClick={() => handleEditComment(service.id, service.comentarios || '')}
                          title="Click para editar comentarios"
                        >
                          <span className="flex-1">
                            {service.comentarios || 'Añadir comentario...'}
                          </span>
                          <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {service.fotoReparado ? (
                        <a
                          href={service.fotoReparado}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-brand-primary hover:text-brand-green"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Ver foto
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin foto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
