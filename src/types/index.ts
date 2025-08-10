export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  clinic?: string;
  role?: string;
  logoUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Invoice {
  id: string;
  number?: number | string;   // Número
  clinic: string;             // Clínica
  amount: number;             // Importe
  date: string;               // Fecha (ISO)
  status: 'paid' | 'pending' | 'overdue'; // Estado
  fileUrl?: string;           // URL del adjunto "Factura"
  description?: string;       // opcional
}

export interface DashboardStats {
  calls30Days: number;
  calls7Days: number;
  appointments30Days: number;
  appointments7Days: number;
  dailyData: {
    date: string;
    calls: number;
    appointments: number;
  }[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUserContext?: (patch: Partial<User>) => void;
}