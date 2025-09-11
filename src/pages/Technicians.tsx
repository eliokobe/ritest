import { useState, useEffect } from 'react';
import { Search, User, MapPin, Phone, FileText, Plus, X } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { Tecnico } from '../types';

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTechnician, setNewTechnician] = useState<Omit<Tecnico, 'id'>>({
    nombre: '',
    provincia: '',
    estado: 'Sin contactar',
    telefono: '',
    observaciones: '',
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const data = await airtableService.getTechnicians();
        setTechnicians(data);
      } catch (error) {
        console.error('Error fetching technicians:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, []);

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechnician.nombre?.trim() || !newTechnician.provincia?.trim() || !newTechnician.telefono?.trim()) return;

    setCreating(true);
    try {
      const createdTechnician = await airtableService.createTechnician(newTechnician);
      setTechnicians(prev => [...prev, createdTechnician]);
      setNewTechnician({
        nombre: '',
        provincia: '',
        estado: 'Sin contactar',
        telefono: '',
        observaciones: '',
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating technician:', error);
      alert('Error al crear el técnico. Por favor, intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTechnician({
      nombre: '',
      provincia: '',
      estado: 'Sin contactar',
      telefono: '',
      observaciones: '',
    });
    setShowModal(false);
  };

  const filteredTechnicians = technicians.filter(technician => {
    const matchesSearch = !searchTerm || 
      technician.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.provincia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.telefono?.includes(searchTerm) ||
      technician.observaciones?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'contratado':
        return 'bg-green-100 text-green-800';
      case 'contactado':
        return 'bg-blue-100 text-blue-800';
      case 'sin contactar':
        return 'bg-yellow-100 text-yellow-800';
      case 'de baja':
        return 'bg-red-100 text-red-800';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Técnicos</h1>
          <p className="text-gray-600 mt-2">Gestión de técnicos y personal</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir Técnico
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, provincia o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de técnicos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombre
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Provincia
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Observaciones
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary mr-2"></div>
                        Cargando técnicos...
                      </div>
                    ) : (
                      <div>
                        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No se encontraron técnicos</p>
                        <p className="mt-1">Intenta ajustar los criterios de búsqueda</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTechnicians.map((technician) => (
                  <tr key={technician.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {technician.nombre || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {technician.provincia || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(technician.estado)}`}>
                        {technician.estado || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {technician.telefono || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={technician.observaciones}>
                        {technician.observaciones || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear técnico */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Añadir Nuevo Técnico</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTechnician} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="nombre"
                  required
                  value={newTechnician.nombre}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Nombre del técnico"
                />
              </div>

              <div>
                <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia *
                </label>
                <input
                  type="text"
                  id="provincia"
                  required
                  value={newTechnician.provincia}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, provincia: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Provincia"
                />
              </div>

              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  id="estado"
                  required
                  value={newTechnician.estado}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, estado: e.target.value as Tecnico['estado'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="Sin contactar">Sin contactar</option>
                  <option value="Contactado">Contactado</option>
                  <option value="Contratado">Contratado</option>
                  <option value="De baja">De baja</option>
                </select>
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  id="telefono"
                  required
                  value={newTechnician.telefono}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Número de teléfono"
                />
              </div>

              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  rows={3}
                  value={newTechnician.observaciones}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, observaciones: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTechnician.nombre?.trim() || !newTechnician.provincia?.trim() || !newTechnician.telefono?.trim()}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear Técnico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
