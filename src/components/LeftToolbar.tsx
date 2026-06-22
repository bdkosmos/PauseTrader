import { Crosshair, Minus, Move, ZoomIn, ZoomOut } from 'lucide-react';

export type Tool = 'crosshair' | 'pan' | 'hline';

interface LeftToolbarProps {
  activeTool: Tool;
  onTool: (tool: Tool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function LeftToolbar({ activeTool, onTool, onZoomIn, onZoomOut, onReset }: LeftToolbarProps) {
  return (
    <aside className="tv-left-toolbar">
      <button
        className={activeTool === 'crosshair' ? 'active' : ''}
        onClick={() => onTool('crosshair')}
        title="Перекрестие"
      >
        <Crosshair size={18} />
      </button>
      <button
        className={activeTool === 'pan' ? 'active' : ''}
        onClick={() => onTool('pan')}
        title="Перемещение"
      >
        <Move size={18} />
      </button>
      <button
        className={activeTool === 'hline' ? 'active' : ''}
        onClick={() => onTool('hline')}
        title="Горизонтальная линия"
      >
        <Minus size={18} />
      </button>
      <div className="tv-toolbar-divider" />
      <button onClick={onZoomIn} title="Приблизить">
        <ZoomIn size={18} />
      </button>
      <button onClick={onZoomOut} title="Отдалить">
        <ZoomOut size={18} />
      </button>
      <button onClick={onReset} title="Сбросить масштаб" className="tv-reset-btn">
        Авто
      </button>
    </aside>
  );
}