/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { User, Task, Invoice, DashboardStats } from '../types';

const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || 'your-base-id';
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY || 'your-api-key';
// Nombre de la tabla de clientes. Se puede sobreescribir con VITE_AIRTABLE_TABLE, pero por defecto es 'Clientes'
const AIRTABLE_CLIENTS_TABLE = import.meta.env.VITE_AIRTABLE_TABLE || 'Clientes';

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

const STATUS_FROM_AT: Record<string, 'pending' | 'in-progress' | 'completed'> = {
  'Pendiente': 'pending',
  'En progreso': 'in-progress',
  'En Progreso': 'in-progress',
  'Completada': 'completed',
  'Hecho': 'completed',
  pending: 'pending',
  'in-progress': 'in-progress',
  completed: 'completed',
};

const STATUS_TO_AT: Record<'pending' | 'in-progress' | 'completed', string> = {
  'pending': 'Pendiente',
  'in-progress': 'En progreso',
  'completed': 'Completada',
};

const INVOICE_STATUS_FROM_AT: Record<string, 'paid' | 'pending' | 'overdue'> = {
  Pagado: 'paid',
  Pagada: 'paid',
  Pendiente: 'pending',
  Vencido: 'overdue',
  Vencida: 'overdue',
  paid: 'paid',
  pending: 'pending',
  overdue: 'overdue',
};

export const airtableService = {
  // Autenticación
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
  const response = await airtableApi.get(`/${AIRTABLE_CLIENTS_TABLE}`, {
        params: {
          filterByFormula: `AND({Email} = '${email}', {Password} = '${password}')`,
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
          name: record.fields.Name,
          phone: record.fields.Phone,
          clinic: record.fields.Clinic,
          role: record.fields.Role,
          logoUrl,
        };
      }
      return null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  },

  // Obtener URL del logo del cliente por ID
  async getClientLogo(clientId: string): Promise<string | undefined> {
    try {
  const { data } = await airtableApi.get(`/${AIRTABLE_CLIENTS_TABLE}/${clientId}`);
      const fields = (data as any)?.fields ?? {};
      const logoField = fields.Logo;
      if (Array.isArray(logoField) && logoField.length > 0 && logoField[0]?.url) {
        return logoField[0].url as string;
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching client logo:', error);
      return undefined;
    }
  },

  // Obtener estadísticas del dashboard (desde tabla Llamadas)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Traer últimos 30 días desde Airtable
      const records = await fetchAllRecords('Llamadas', {
        filterByFormula: "IS_AFTER({Fecha}, DATEADD(TODAY(), -30, 'days'))",
        pageSize: 100,
      });

      // Normalizar
      type CallRec = { fecha: Date; estado?: string };
      const calls: CallRec[] = records
        .map((r: any) => ({
          fecha: new Date(r.fields?.Fecha),
          estado: r.fields?.Estado,
        }))
        .filter((r: CallRec) => !isNaN(r.fecha.getTime())); // solo fechas válidas

      // Acumulados 30/7 días
      let calls30Days = 0;
      let calls7Days = 0;
      let appointments30Days = 0;
      let appointments7Days = 0;

      // Mapa por día (últimos 7 días) para gráficos
      const dayKey = (d: Date) => d.toISOString().split('T')[0];
      const last7Keys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        last7Keys.push(dayKey(d));
      }
      const byDay = new Map(last7Keys.map(k => [k, { calls: 0, appointments: 0 }]));

      for (const rec of calls) {
        const is30 = rec.fecha >= thirtyDaysAgo && rec.fecha <= now;
        const is7 = rec.fecha >= sevenDaysAgo && rec.fecha <= now;
        const isAppointment = rec.estado === 'Cita agendada';

        if (is30) {
          calls30Days++;
          if (isAppointment) appointments30Days++;
        }
        if (is7) {
          calls7Days++;
          if (isAppointment) appointments7Days++;
          const k = dayKey(rec.fecha);
          if (byDay.has(k)) {
            const agg = byDay.get(k)!;
            agg.calls += 1;
            if (isAppointment) agg.appointments += 1;
          }
        }
      }

      const dailyData = last7Keys.map(k => ({
        date: k,
        calls: byDay.get(k)!.calls,
        appointments: byDay.get(k)!.appointments,
      }));

      return {
        calls30Days,
        calls7Days,
        appointments30Days,
        appointments7Days,
        dailyData,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Obtener tareas
  async getTasks(clinic?: string): Promise<Task[]> {
    try {
      const params: Record<string, any> = {};
      if (clinic) {
        params.filterByFormula = `{Clínica} = '${clinic}'`;
      }
      const response = await airtableApi.get('/Tareas', { params });
      const data = response.data as { records: any[] };

      return data.records.map((record: any) => {
        const fields = record.fields ?? {};
        const rawStatus = fields['Estado'] ?? fields.Status;
        const mappedStatus = STATUS_FROM_AT[rawStatus] ?? 'pending';
        const rawDue = fields['Fecha límite'] ?? fields.DueDate;
        const dueISO =
          rawDue ? new Date(rawDue).toISOString() : new Date().toISOString();

        return {
          id: record.id,
          title: fields['Tarea'] ?? fields.Title ?? '',
          description: fields['Descripción'] ?? fields.Description ?? '',
          status: mappedStatus,
          assignedTo: fields['Asignado'] ?? fields.AssignedTo ?? '',
          dueDate: dueISO,
          // La tabla no tiene prioridad; por defecto 'medium'
          priority: 'medium',
        };
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  },

  // Actualizar estado de tarea
  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      const mapped = STATUS_TO_AT[(status as Task['status'])] ?? status;
      await airtableApi.patch(`/Tareas/${taskId}`, {
        fields: {
          Estado: mapped,
        },
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  },

  // Obtener facturas
  async getInvoices(clinic?: string): Promise<Invoice[]> {
    try {
      const params: Record<string, any> = {};
      if (clinic) {
        // Filtra por la clínica del usuario si existe
        params.filterByFormula = `{Clínica} = '${clinic}'`;
      }
      const { data } = await airtableApi.get('/Facturas', { params });
      const records = (data as { records: any[] }).records ?? [];

      return records.map((r: any) => {
        const f = r.fields ?? {};
        const attach = Array.isArray(f['Factura']) ? f['Factura'][0] : undefined;
        return {
          id: r.id,
          number: f['Número'] ?? f.Number,
          clinic: f['Clínica'] ?? f.Clinic ?? '',
          amount: Number(f['Importe'] ?? f.Amount ?? 0),
          date: f['Fecha'] ?? f.Date,
          status: INVOICE_STATUS_FROM_AT[f['Estado'] ?? f.Status] ?? 'pending',
          fileUrl: attach?.url,
          description: f.Description, // si existiera
        };
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  },

  // Actualizar usuario

  // Actualizar usuario (campos en español)
  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    // Mapear solo a columnas en español
    const fields: Record<string, any> = {};
    if (userData.name !== undefined) fields['Name'] = userData.name;
    if (userData.email !== undefined) fields['Email'] = userData.email;
    if (userData.phone !== undefined) fields['Teléfono'] = userData.phone;
    if (userData.clinic !== undefined) fields['Clínica'] = userData.clinic;
    try {
  await airtableApi.patch(`/${AIRTABLE_CLIENTS_TABLE}/${userId}`, { fields });
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

  // Obtener recursos (tabla "Recursos")
  async getResources(): Promise<{
    id: string;
    name: string;
    description?: string;
    type?: string;
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
          type: f['Tipo'] ?? f['Type'],
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
