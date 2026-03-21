import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { getItem, getItemSummary, generateItemSummary } from '../services/api';
import '../styles/Summary.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COLOR_PALETTE = [
  '#1d4ed8',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#16a34a',
  '#be123c',
  '#4f46e5',
  '#9333ea',
];

const getCurrencySymbol = (currency) => {
  const symbols = { soles: 'S/', dolares: '$', reales: 'R$' };
  return symbols[currency] || 'S/';
};

function Summary() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      const response = await getItemSummary(itemId);
      const payload = response.data;
      setSummary(payload);
      const currencies = Object.keys(payload.categories_by_currency || {});
      setSelectedCurrency((prev) => (prev && currencies.includes(prev) ? prev : (currencies[0] || '')));
      setError('');
    } catch (err) {
      if (err.response?.status === 404) {
        setSummary(null);
        setError('');
      } else if (err.response?.status === 503) {
        setError('Falta configurar OPENAI_API_KEY en backend.');
      } else {
        setError(err.response?.data?.detail || 'No se pudo cargar el resumen.');
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const itemResponse = await getItem(itemId);
        setItem(itemResponse.data);
        await fetchSummary();
      } catch (err) {
        alert('Error al cargar el resumen del item');
        navigate('/items');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [itemId]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');
      const response = await generateItemSummary(itemId);
      const payload = response.data;
      setSummary(payload);
      const currencies = Object.keys(payload.categories_by_currency || {});
      setSelectedCurrency(currencies[0] || '');
    } catch (err) {
      if (err.response?.status === 503) {
        setError('Falta configurar OPENAI_API_KEY en backend.');
      } else {
        setError(err.response?.data?.detail || 'No se pudo generar el resumen con IA.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const currencies = useMemo(() => Object.keys(summary?.categories_by_currency || {}), [summary]);
  const currentStats = summary?.categories_by_currency?.[selectedCurrency] || [];

  const barData = useMemo(() => ({
    labels: currentStats.map((item) => item.category),
    datasets: [
      {
        label: `Monto ${getCurrencySymbol(selectedCurrency)}`,
        data: currentStats.map((item) => item.total_amount),
        backgroundColor: currentStats.map((_, idx) => COLOR_PALETTE[idx % COLOR_PALETTE.length]),
      },
    ],
  }), [currentStats, selectedCurrency]);

  const pieData = useMemo(() => ({
    labels: currentStats.map((item) => item.category),
    datasets: [
      {
        data: currentStats.map((item) => item.total_amount),
        backgroundColor: currentStats.map((_, idx) => COLOR_PALETTE[idx % COLOR_PALETTE.length]),
      },
    ],
  }), [currentStats]);

  if (loading) return <div className="summary-loading">Cargando resumen...</div>;

  return (
    <div className="summary-page">
      <div className="summary-page-header">
        <button onClick={() => navigate(`/items/${itemId}/expenses`)} className="summary-back">
          ← Volver a Gastos
        </button>
        <button onClick={handleGenerate} className="summary-generate" disabled={generating}>
          {generating ? 'Generando...' : 'Generar/Actualizar Resumen'}
        </button>
      </div>

      <h1 className="summary-title">Resumen IA - {item?.name}</h1>

      {error && <div className="summary-error">{error}</div>}

      {!summary && !error && (
        <div className="summary-empty">
          Aún no hay resumen generado para este item. Usa el botón para generarlo.
        </div>
      )}

      {summary && (
        <>
          <div className="summary-meta">
            <span>Gastos procesados: {summary.expenses_processed}</span>
            <span>Modelo: {summary.ai_model || '-'}</span>
            <span>Generado: {new Date(`${summary.generated_at}Z`).toLocaleString('es-PE')}</span>
          </div>

          <div className="currency-tabs">
            {currencies.map((currency) => (
              <button
                key={currency}
                className={`currency-tab ${currency === selectedCurrency ? 'active' : ''}`}
                onClick={() => setSelectedCurrency(currency)}
              >
                {currency} ({getCurrencySymbol(currency)})
              </button>
            ))}
          </div>

          {currentStats.length > 0 ? (
            <div className="charts-grid">
              <div className="chart-card">
                <h3>Barras por Categoría</h3>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div className="chart-card">
                <h3>Distribución (Pie)</h3>
                <Pie
                  data={pieData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="summary-empty">
              No hay datos para la moneda seleccionada.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Summary;
