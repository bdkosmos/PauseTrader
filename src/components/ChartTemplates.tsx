import { Bookmark, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChartTemplate, Timeframe } from '../types';

const STORAGE_KEY = 'pausetrader-templates';

function loadTemplates(): ChartTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChartTemplate[]) : [];
  } catch {
    return [];
  }
}

interface ChartTemplatesProps {
  symbol: string;
  base: string;
  timeframe: Timeframe;
  onApply: (template: ChartTemplate) => void;
}

export function ChartTemplates({ symbol, base, timeframe, onApply }: ChartTemplatesProps) {
  const [templates, setTemplates] = useState<ChartTemplate[]>(loadTemplates);
  const [name, setName] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  const saveTemplate = () => {
    const title = name.trim() || `${base} · ${timeframe}`;
    const template: ChartTemplate = {
      id: crypto.randomUUID(),
      name: title,
      symbol,
      timeframe,
      createdAt: Date.now(),
    };
    setTemplates((prev) => [template, ...prev].slice(0, 15));
    setName('');
  };

  const removeTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="pro-feature templates">
      <div className="pro-feature-head">
        <h3>Шаблоны графика</h3>
        <span className="pro-feature-badge">Pro</span>
      </div>

      <div className="template-form">
        <input
          type="text"
          placeholder={`${base} · ${timeframe}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="template-save-btn" onClick={saveTemplate}>
          <Bookmark size={14} />
          Сохранить
        </button>
      </div>

      <div className="template-list">
        {templates.length === 0 ? (
          <div className="pro-empty">Шаблонов пока нет</div>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.id} className="template-row">
              <button type="button" className="template-load" onClick={() => onApply(tpl)}>
                <strong>{tpl.name}</strong>
                <small>
                  {tpl.symbol.replace('USDT', '')} · {tpl.timeframe}
                </small>
              </button>
              <button type="button" onClick={() => removeTemplate(tpl.id)} aria-label="Удалить">
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}