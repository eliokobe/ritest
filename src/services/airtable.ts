/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { User, DashboardStats } from '../types';

// Base ID fijo (no es secreto). Si se define VITE_AIRTABLE_BASE_ID la sobreescribe.
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || 'appRMClMob8KPNooU';
// API Key solo por variable de entorno (no hardcodear). Placeholder si falta.
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY || 'your-api-key';
// Nombre de la tabla de trabajadores. Se puede sobreescribir con VITE_AIRTABLE_WORKERS_TABLE, pero por defecto es 'Trabajadores'
const AIRTABLE_WORKERS_TABLE = import.meta.env.VITE_AIRTABLE_WORKERS_TABLE || 'Trabajadores';

if (AIRTABLE_BASE_ID === 'your-base-id') {
  // Build sin sustituir env -> avisamos en runtime
  console.error('[Airtable] Falta VITE_AIRTABLE_BASE_ID en build; usando placeholder');
}
if (AIRTABLE_API_KEY === 'your-api-key') {
  console.error('[Airtable] Falta VITE_AIRTABLE_API_KEY (no habrá acceso a Airtable)');
}

const airtableApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Helper para paginar Airtable
async function fetchAllRecords(table: string, params: Record<string, any> = {}) {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const { data } = await airtableApi.get(`/${table}`, { params: { ...params, offset } });
    const airtableData = data as { records?: any[]; offset?: string };
    all.push(...(airtableData.records ?? []));
    offset = airtableData.offset;
  } while (offset);
  return all;
}



export const airtableService = {
  // Autenticación
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const response = await airtableApi.get(`/${AIRTABLE_WORKERS_TABLE}`, {
        params: {
          filterByFormula: `AND({Email} = '${email}', {Contraseña} = '${password}')`,
        },
      });

      const data = response.data as { records: any[] };

      if (data.records.length > 0) {
        const record = data.records[0];
        const logoField = record.fields.Logo;
        let logoUrl: string | undefined;
        if (Array.isArray(logoField) && logoField.length > 0) {
          const first = logoField[0];
          logoUrl = (first?.url || first?.thumbnails?.large?.url || first?.thumbnails?.full?.url) as string | undefined;
        }
        return {
          id: record.id,
          email: record.fields.Email,
          name: record.fields.Nombre || record.fields.Name,
          phone: record.fields.Teléfono || record.fields.Phone,
          clinic: record.fields.Empresa || record.fields.Clinic,
          role: record.fields.Cargo || record.fields.Role,
          logoUrl,
        };
      }
      return null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  },

  // Obtener URL del logo del trabajador por ID
  async getClientLogo(workerId: string): Promise<string | undefined> {
    try {
      const { data } = await airtableApi.get(`/${AIRTABLE_WORKERS_TABLE}/${workerId}`);
      const fields = (data as any)?.fields ?? {};
      const logoField = fields.Logo;
      if (Array.isArray(logoField) && logoField.length > 0 && logoField[0]?.url) {
        return logoField[0].url as string;
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching worker logo:', error);
      return undefined;
    }
  },

  // Obtener estadísticas del dashboard (desde tabla Servicios)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Intentar traer todos los servicios activos (con filtro Activo = Sí)
      let records: any[] = [];
      try {
        records = await fetchAllRecords('Servicios', {
          filterByFormula: `{Activo} = 'Sí'`,
          pageSize: 100,
        });
      } catch (error) {
        console.warn('No se pudo acceder a la tabla Servicios:', error);
        // Retornar estadísticas vacías si no existe la tabla
        const emptyDailyData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          emptyDailyData.push({
            date: d.toISOString().split('T')[0],
            services: 0,
            completed: 0,
          });
        }
        return {
          services30Days: 0,
          services7Days: 0,
          servicesCompleted30Days: 0,
          servicesCompleted7Days: 0,
          dailyData: emptyDailyData,
        };
      }

      // Normalizar - usar múltiples posibles nombres para la fecha
      type ServiceRec = { fecha: Date; estado?: string };
      const services: ServiceRec[] = records
        .map((r: any) => {
          const fields = r.fields || {};
          let fechaValue = fields.Fecha || 
                          fields['Fecha de creación'] || 
                          fields['Created'] || 
                          fields['Date'] ||
                          new Date().toISOString(); // fecha actual como fallback
          
          return {
            fecha: new Date(fechaValue),
            estado: fields.Estado || fields.Status,
          };
        })
        .filter((r: ServiceRec) => !isNaN(r.fecha.getTime())); // solo fechas válidas

      // Acumulados 30/7 días
      let services30Days = 0;
      let services7Days = 0;
      let servicesCompleted30Days = 0;
      let servicesCompleted7Days = 0;

      // Mapa por día (últimos 7 días) para gráficos
      const dayKey = (d: Date) => d.toISOString().split('T')[0];
      const last7Keys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        last7Keys.push(dayKey(d));
      }
      const byDay = new Map(last7Keys.map(k => [k, { services: 0, completed: 0 }]));

      for (const rec of services) {
        const is30 = rec.fecha >= thirtyDaysAgo && rec.fecha <= now;
        const is7 = rec.fecha >= sevenDaysAgo && rec.fecha <= now;
        const isCompleted = rec.estado?.toLowerCase().includes('completado') || 
                           rec.estado?.toLowerCase().includes('reparado') ||
                           rec.estado?.toLowerCase().includes('finished') ||
                           rec.estado?.toLowerCase().includes('done');

        if (is30) {
          services30Days++;
          if (isCompleted) servicesCompleted30Days++;
        }
        if (is7) {
          services7Days++;
          if (isCompleted) servicesCompleted7Days++;
          const k = dayKey(rec.fecha);
          if (byDay.has(k)) {
            const agg = byDay.get(k)!;
            agg.services += 1;
            if (isCompleted) agg.completed += 1;
          }
        }
      }

      const dailyData = last7Keys.map(k => ({
        date: k,
        services: byDay.get(k)!.services,
        completed: byDay.get(k)!.completed,
      }));

      return {
        services30Days,
        services7Days,
        servicesCompleted30Days,
        servicesCompleted7Days,
        dailyData,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // En caso de error, retornar estadísticas vacías en lugar de fallar
      const emptyDailyData = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        emptyDailyData.push({
          date: d.toISOString().split('T')[0],
          services: 0,
          completed: 0,
        });
      }
      return {
        services30Days: 0,
        services7Days: 0,
        servicesCompleted30Days: 0,
        servicesCompleted7Days: 0,
        dailyData: emptyDailyData,
      };
    }
  },





  // Actualizar trabajador (campos en español)
  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    // Mapear a columnas en español de la tabla Trabajadores
    const fields: Record<string, any> = {};
    if (userData.name !== undefined) fields['Nombre'] = userData.name;
    if (userData.email !== undefined) fields['Email'] = userData.email;
    if (userData.phone !== undefined) fields['Teléfono'] = userData.phone;
    if (userData.clinic !== undefined) fields['Empresa'] = userData.clinic;
    if (userData.role !== undefined) fields['Cargo'] = userData.role;
    try {
      await airtableApi.patch(`/${AIRTABLE_WORKERS_TABLE}/${userId}`, { fields });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Crear reunión (tabla "Reuniones"). Acepta fecha (YYYY-MM-DD) y opcionalmente hora (HH:mm).
  async createMeeting(params: { clinic: string; date: string; reason: string; time?: string }): Promise<void> {
    const { clinic, date, reason, time } = params;
    try {
      let dateToSend: string = date;
      if (time) {
        // Combina fecha + hora en un Date local y lo envía como ISO (UTC)
        const [year, month, day] = date.split('-').map((n) => parseInt(n, 10));
        const [hour, minute] = time.split(':').map((n) => parseInt(n, 10));
        const dt = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0);
        dateToSend = dt.toISOString();
      }

      await airtableApi.post('/Reuniones', {
        fields: {
          'Clínica': clinic,
          'Fecha': dateToSend, // ISO con hora si se pasó "time"
          'Motivo': reason,
        },
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  },

  // Obtener llamadas (tabla "Llamadas")
  async getCalls(clinic?: string): Promise<{
    id: string;
    phone?: string;
    status?: string;
    clinic?: string;
    date?: string;
    time?: string;
    recordingUrl?: string;
  }[]> {
    try {
      // Filtro de últimos 30 días + opcionalmente clínica (soporta 'Clínica' y 'Clinic')
      const last30 = "IS_AFTER({Fecha}, DATEADD(TODAY(), -30, 'days'))";
      let formula = last30;
      if (clinic) {
        const clinicEsc = String(clinic).replace(/'/g, "\\'");
        const clinicCond = `OR({Clínica} = '${clinicEsc}', {Clinic} = '${clinicEsc}')`;
        formula = `AND(${last30}, ${clinicCond})`;
      }
      const records = await fetchAllRecords('Llamadas', {
        filterByFormula: formula,
        pageSize: 100,
      });

      return records.map((r: any) => {
        const f = r.fields ?? {};
        const fechaRaw = f['Fecha'] ?? f['Date'];
        let dateISO: string | undefined;
        let timeStr: string | undefined;
        if (fechaRaw) {
          const d = new Date(fechaRaw);
          if (!isNaN(d.getTime())) {
            dateISO = d.toISOString();
            // hora local HH:mm
            timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          }
        }
        // Si existe un campo "Hora" separado, úsalo
        if (f['Hora']) {
          timeStr = f['Hora'];
        }

        // Campo de grabación: puede ser adjunto o URL en texto
        let recordingUrl: string | undefined;
        const grab = f['Grabación'] ?? f['Grabacion'] ?? f['Recording'];
        if (Array.isArray(grab) && grab.length > 0 && grab[0]?.url) {
          recordingUrl = grab[0].url;
        } else if (typeof grab === 'string') {
          recordingUrl = grab;
        }

        return {
          id: r.id,
          phone: f['Teléfono'] ?? f['Telefono'] ?? f['Phone'],
          status: f['Estado'] ?? f['Status'],
          clinic: f['Clínica'] ?? f['Clinic'],
          date: dateISO,
          time: timeStr,
          recordingUrl,
        };
      });
    } catch (error) {
      console.error('Error fetching calls:', error);
      return [];
    }
  },

  // Crear ticket de soporte (tabla "Tickets")
  async createTicket(params: { email: string; subject: string; message: string }): Promise<string | void> {
    const { email, subject, message } = params;
    const payload = {
      fields: {
        Email: email,
        'Asunto': subject,
        'Consulta': message,
      },
    } as const;
    try {
      const { data } = await airtableApi.post('/Tickets', payload);
      return (data as any)?.id;
    } catch (err) {
      console.error('Error creating support ticket:', err);
      throw err;
    }
  },

  // Obtener servicios (tabla "Servicios")
  async getServices(clinic?: string): Promise<{
    id: string;
    expediente?: string;
    cliente?: string;
    telefono?: string;
    estado?: string;
    comentarios?: string;
    tecnico?: string;
    fotoReparado?: string;
    reparacion?: string;
  }[]> {
    try {
      let filterFormula = `{Activo} = 'Sí'`;
      
      if (clinic) {
        filterFormula = `AND({Activo} = 'Sí', {Empresa} = '${clinic}')`;
      }
      
      const params: Record<string, any> = {
        filterByFormula: filterFormula
      };
      
      const records = await fetchAllRecords('Servicios', { ...params, pageSize: 100 });
      
      return records.map((r: any) => {
        const f = r.fields ?? {};
        
        // Campo de foto reparado: puede ser adjunto o URL en texto
        let fotoReparado: string | undefined;
        const foto = f['Foto reparado'] ?? f['FotoReparado'];
        if (Array.isArray(foto) && foto.length > 0 && foto[0]?.url) {
          fotoReparado = foto[0].url;
        } else if (typeof foto === 'string') {
          fotoReparado = foto;
        }

        return {
          id: r.id,
          expediente: f['Expediente'],
          cliente: f['Cliente'],
          telefono: f['Teléfono'] ?? f['Telefono'],
          estado: f['Estado'],
          comentarios: f['Comentarios'],
          tecnico: f['Técnico'] ?? f['Tecnico'],
          fotoReparado,
          reparacion: f['Reparación'] ?? f['Reparacion'],
        };
      });
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  },

  // Actualizar comentarios de un servicio
  async updateServiceComments(serviceId: string, comentarios: string): Promise<void> {
    try {
      await airtableApi.patch(`/Servicios/${serviceId}`, {
        fields: {
          'Comentarios': comentarios,
        },
      });
    } catch (error) {
      console.error('Error updating service comments:', error);
      throw error;
    }
  },

  // Actualizar estado de un servicio
  async updateServiceStatus(serviceId: string, estado: string): Promise<void> {
    try {
      await airtableApi.patch(`/Servicios/${serviceId}`, {
        fields: {
          'Estado': estado,
        },
      });
    } catch (error) {
      console.error('Error updating service status:', error);
      throw error;
    }
  },

  // Obtener técnicos desde Airtable
  async getTechnicians(): Promise<import('../types').Tecnico[]> {
    try {
      const records = await fetchAllRecords('Técnicos', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          nombre: f['Nombre'] ?? f['Name'],
          provincia: f['Provincia'] ?? f['Province'],
          estado: f['Estado'] ?? f['Status'],
          telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Phone'],
          observaciones: f['Observaciones'] ?? f['Observacion'] ?? f['Notes'],
        };
      });
    } catch (error) {
      console.error('Error fetching technicians:', error);
      return [];
    }
  },

  // Crear nuevo técnico
  async createTechnician(technician: Omit<import('../types').Tecnico, 'id'>): Promise<import('../types').Tecnico> {
    try {
      const response = await axios.post(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Técnicos`, {
        records: [{
          fields: {
            'Nombre': technician.nombre || '',
            'Provincia': technician.provincia || '',
            'Estado': technician.estado || 'Sin contactar',
            'Teléfono': technician.telefono || '',
            'Observaciones': technician.observaciones || '',
          }
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const createdRecord = response.data.records[0];
      const f = createdRecord.fields;
      return {
        id: createdRecord.id,
        nombre: f['Nombre'],
        provincia: f['Provincia'],
        estado: f['Estado'],
        telefono: f['Teléfono'],
        observaciones: f['Observaciones'],
      };
    } catch (error) {
      console.error('Error creating technician:', error);
      throw new Error('Error al crear el técnico');
    }
  },

  // Actualizar observaciones de un técnico
  async updateTechnicianObservations(technicianId: string, observaciones: string): Promise<void> {
    try {
      await airtableApi.patch(`/Técnicos/${technicianId}`, {
        fields: {
          'Observaciones': observaciones,
        },
      });
    } catch (error) {
      console.error('Error updating technician observations:', error);
      throw error;
    }
  },

  // Actualizar estado de un técnico
  async updateTechnicianStatus(technicianId: string, estado: string): Promise<void> {
    try {
      await airtableApi.patch(`/Técnicos/${technicianId}`, {
        fields: {
          'Estado': estado,
        },
      });
    } catch (error) {
      console.error('Error updating technician status:', error);
      throw error;
    }
  },

  // Obtener recursos (tabla "Recursos")
  async getResources(): Promise<{
    id: string;
    name: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    imageUrl?: string;
  }[]> {
    try {
      const records = await fetchAllRecords('Recursos', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        const file = Array.isArray(f['Archivo'] ?? f['File']) ? (f['Archivo'] ?? f['File'])[0] : undefined;
        const photo = Array.isArray(f['Foto'] ?? f['Photo']) ? (f['Foto'] ?? f['Photo'])[0] : undefined;
        return {
          id: r.id,
          name: f['Nombre'] ?? f['Name'] ?? 'Recurso',
          description: f['Descripción'] ?? f['Descripcion'] ?? f['Description'],
          fileUrl: file?.url,
          fileName: file?.filename,
          imageUrl: photo?.url,
        };
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  },
};
