import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCapital, createIncome, updateIncome, deleteIncome } from '../services/api';
import '../styles/Capital.css';

const getCurrencySymbol = (currency) => {
  const symbols = { soles: 'S/', dolares: '$', reales: 'R$' };
  return symbols[currency] || 'S/';
};

const CURRENCY_LABELS = { soles: 'Soles', dolares: 'Dólares', reales: 'Reales' };

const IncomeItem = ({ income, onUpdate, onCancel, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(income.amount);
  const [description, setDescription] = useState(income.description || '');
  const [dayOfMonth, setDayOfMonth] = useState(income.day_of_month || '');

  const isCancelled = income.income_type === 'periodic' && income.end_date;

  const handleSave = async () => {
    const data = { amount: parseFloat(amount), description: description.trim() || null };
    if (income.income_type === 'periodic') {
      data.day_of_month = parseInt(dayOfMonth);
    }
    await onUpdate(income.id, data);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setAmount(income.amount);
    setDescription(income.description || '');
    setDayOfMonth(income.day_of_month || '');
    setIsEditing(false);
  };

  return (
    <div className={`income-item ${isCancelled ? 'income-cancelled' : ''}`}>
      {isEditing ? (
        <>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="income-input income-amount-input"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción"
            className="income-input"
          />
          {income.income_type === 'periodic' && (
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="income-input income-day-input"
              title="Día del mes"
            />
          )}
          <button className="btn-save-template" onClick={handleSave}>✓</button>
          <button className="btn-cancel-template" onClick={handleCancelEdit}>✗</button>
        </>
      ) : (
        <>
          <div className="income-info">
            <span className="income-badge">{income.income_type === 'periodic' ? '🔁' : '•'}</span>
            <span className="income-amount">
              {getCurrencySymbol(income.currency)}{income.amount.toFixed(2)}
            </span>
            <span className="income-description">{income.description || 'Sin descripción'}</span>
            {income.income_type === 'periodic' && (
              <span className="income-day">día {income.day_of_month}{isCancelled ? ' (cancelado)' : ''}</span>
            )}
          </div>
          <button className="btn-edit-template" onClick={() => setIsEditing(true)}>✏️</button>
          {income.income_type === 'periodic' && !isCancelled && (
            <button className="btn-delete-template" onClick={() => onCancel(income.id)} title="Cancelar ingreso periódico">🛑</button>
          )}
          {income.income_type === 'one_time' && (
            <button className="btn-delete-template" onClick={() => onDelete(income.id)}>🗑️</button>
          )}
        </>
      )}
    </div>
  );
};

function Capital() {
  const navigate = useNavigate();
  const [byCurrency, setByCurrency] = useState({});
  const [owedToMe, setOwedToMe] = useState({});
  const [iOwe, setIOwe] = useState({});
  const [incomes, setIncomes] = useState([]);
  const [detail, setDetail] = useState({ incomes: [], items: [] });
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'soles' | 'dolares'
  const [incomeType, setIncomeType] = useState('one_time');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('soles');
  const [description, setDescription] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const fetchCapital = async (mode = viewMode) => {
    try {
      const response = await getCapital(mode === 'all' ? null : mode);
      setByCurrency(response.data.by_currency || {});
      setOwedToMe(response.data.owed_to_me || {});
      setIOwe(response.data.i_owe || {});
      setIncomes(response.data.incomes || []);
      setDetail(response.data.detail || { incomes: [], items: [] });
    } catch (error) {
      console.error('Error fetching capital:', error);
      alert(error.response?.data?.detail || 'No se pudo obtener el tipo de cambio. Mostrando por moneda original.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapital();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    fetchCapital(mode);
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    try {
      const data = {
        income_type: incomeType,
        amount: parseFloat(amount),
        currency,
        description: description.trim() || null,
      };
      if (incomeType === 'periodic') {
        data.day_of_month = parseInt(dayOfMonth);
      }
      await createIncome(data);
      setAmount('');
      setDescription('');
      await fetchCapital();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al agregar ingreso');
    }
  };

  const handleUpdateIncome = async (incomeId, data) => {
    try {
      await updateIncome(incomeId, data);
      await fetchCapital();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al actualizar ingreso');
    }
  };

  const handleCancelIncome = async (incomeId) => {
    if (!confirm('¿Cancelar este ingreso periódico? Dejará de sumarse a partir de ahora.')) return;
    await handleUpdateIncome(incomeId, { end_date: new Date().toISOString() });
  };

  const handleDeleteIncome = async (incomeId) => {
    if (!confirm('¿Eliminar este ingreso puntual?')) return;
    try {
      await deleteIncome(incomeId);
      await fetchCapital();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al eliminar ingreso');
    }
  };

  if (loading) return <div className="loading-screen">Cargando...</div>;

  const currencies = Object.keys(byCurrency);

  return (
    <div className="capital-page">
      <div className="capital-header">
        <button onClick={() => navigate('/items')} className="btn-back">← Volver</button>
        <h1>Mi Presupuesto</h1>
      </div>

      {currencies.length > 0 && (
        <div className="toggle-group capital-view-toggle">
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('all')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'soles' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('soles')}
          >
            Solo Soles
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === 'dolares' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('dolares')}
          >
            Solo Dólares
          </button>
        </div>
      )}

      <div className="capital-cards">
        {currencies.length === 0 ? (
          <p className="capital-empty">Aún no tienes ingresos ni gastos registrados.</p>
        ) : (
          currencies.map((curr) => (
            <div key={curr} className={`capital-card ${byCurrency[curr] < 0 ? 'negative' : 'positive'}`}>
              <h3>{CURRENCY_LABELS[curr] || curr}</h3>
              <p className="capital-amount">
                {getCurrencySymbol(curr)}{byCurrency[curr].toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>

      {(Object.keys(owedToMe).length > 0 || Object.keys(iOwe).length > 0) && (
        <div className="debts-card">
          <p className="debts-hint">
            Ya incluido en tu presupuesto de arriba — esto es el detalle de por qué:
          </p>
          <div className="debts-row">
            {Object.entries(owedToMe).map(([curr, amount]) => (
              <span key={`owed-${curr}`} className="debt-owed">
                💰 Te deben {getCurrencySymbol(curr)}{amount.toFixed(2)}
              </span>
            ))}
            {Object.entries(iOwe).map(([curr, amount]) => (
              <span key={`iowe-${curr}`} className="debt-iowe">
                📤 Debes {getCurrencySymbol(curr)}{amount.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {currencies.length > 0 && (
        <div className="detail-card">
          <button
            type="button"
            className="btn-detail-toggle"
            onClick={() => setShowDetail((v) => !v)}
          >
            {showDetail ? '▲ Ocultar' : '▼ Ver'} detalle de cómo se calcula el presupuesto
          </button>

          {showDetail && (
            <div className="detail-content">
              <div className="detail-section">
                <h3>➕ Ingresos que suman</h3>
                {detail.incomes.length === 0 ? (
                  <p className="capital-empty">Sin ingresos registrados.</p>
                ) : (
                  <div className="detail-list">
                    {detail.incomes.map((inc) => (
                      <div key={inc.id} className="detail-row">
                        <span className="detail-row-label">
                          {inc.income_type === 'periodic' ? '🔁' : '•'} {inc.description || 'Sin descripción'}
                        </span>
                        <span className="detail-row-amount detail-positive">
                          {inc.occurrences > 1
                            ? `${getCurrencySymbol(inc.currency)}${inc.base_amount.toFixed(2)} x ${inc.occurrences} = `
                            : ''}
                          +{getCurrencySymbol(inc.currency)}{inc.contributed_amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h3>➖ Gastos que restan (por item activo)</h3>
                {detail.items.length === 0 ? (
                  <p className="capital-empty">No tienes gastos en items activos.</p>
                ) : (
                  <div className="detail-list">
                    {detail.items.map((item) => (
                      <div key={item.item_id} className="detail-row detail-row-item">
                        <span className="detail-row-label">
                          {item.item_type === 'personal' ? '👤' : '👥'} {item.item_name}
                          <span className="detail-row-sub">
                            {' '}({item.item_type === 'personal' ? 'personal' : 'compartido'}
                            {item.role === 'owner' ? ', dueño/a' : ', participante'}, {item.expense_count} gasto{item.expense_count !== 1 ? 's' : ''})
                          </span>
                        </span>
                        <span className="detail-row-amount detail-negative">
                          {Object.entries(item.amounts).map(([curr, amt]) => (
                            <span key={curr}>-{getCurrencySymbol(curr)}{amt.toFixed(2)} </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="detail-footnote">
                Los items archivados no se incluyen — sus gastos ya quedaron reflejados en el capital inicial.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="income-form-card">
        <h2>Agregar Ingreso</h2>
        <form onSubmit={handleAddIncome}>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${incomeType === 'one_time' ? 'active' : ''}`}
              onClick={() => setIncomeType('one_time')}
            >
              Puntual
            </button>
            <button
              type="button"
              className={`toggle-btn ${incomeType === 'periodic' ? 'active' : ''}`}
              onClick={() => setIncomeType('periodic')}
            >
              Periódico
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="soles">Soles</option>
                <option value="dolares">Dólares</option>
                <option value="reales">Reales</option>
              </select>
            </div>
          </div>

          {incomeType === 'periodic' && (
            <div className="form-group">
              <label>Día del mes</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Descripción (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={incomeType === 'periodic' ? 'Ej: Sueldo' : 'Ej: Bono'}
            />
          </div>

          <button type="submit" className="btn-primary">Agregar Ingreso</button>
        </form>
      </div>

      <div className="income-list-card">
        <h2>Historial de Ingresos</h2>
        {incomes.length === 0 ? (
          <p className="capital-empty">No hay ingresos registrados.</p>
        ) : (
          <div className="income-list">
            {incomes.map((income) => (
              <IncomeItem
                key={income.id}
                income={income}
                onUpdate={handleUpdateIncome}
                onCancel={handleCancelIncome}
                onDelete={handleDeleteIncome}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Capital;
