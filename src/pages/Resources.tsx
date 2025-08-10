import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { airtableService } from '../services/airtable';

type Resource = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  imageUrl?: string;
};

const Resources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await airtableService.getResources();
        setResources(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const r of resources) {
      const k = r.type || 'Otros';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries());
  }, [resources]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Recursos</h1>
        <p className="text-gray-600 mt-2">Accede a guías, documentos legales y recursos útiles para tu clínica</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0059F1]"></div>
        </div>
      ) : (
        grouped.map(([group, items]) => (
          <section key={group} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{group}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((res) => (
                <article key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-[#001a57] via-[#003cb8] to-[#0059f1] flex items-center justify-center">
                    {res.imageUrl ? (
                      <img src={res.imageUrl} alt={res.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-white/80 text-xl">{res.type || 'Recurso'}</span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{res.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{res.description || '\u00A0'}</p>
                  {res.fileUrl && (
                    <a
                      href={res.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center justify-center w-full bg-[#0059F1] hover:bg-[#003CB8] text-white px-4 py-2 rounded-full text-sm font-medium"
                    >
                      <Download className="h-4 w-4 mr-2" /> Descargar
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default Resources;
