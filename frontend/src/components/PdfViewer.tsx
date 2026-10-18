import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react';

interface PdfPage {
  page_number: number;
  text: string;
}

interface PdfViewerProps {
  data: {
    title?: string;
    pages: PdfPage[];
    total_pages: number;
  };
  onChange?: (updatedData: any) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const pages = data?.pages || [];
  const totalPages = data?.total_pages || pages.length || 1;

  const activePageData = pages.find(p => p.page_number === currentPage) || pages[0] || { page_number: 1, text: 'Нет данных' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-body)', borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      {/* Верхняя панель управления читалкой */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          <span>PDF Документ ({totalPages} стр.)</span>
        </div>

        {/* Навигация по страницам */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text-main)', opacity: currentPage <= 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>
            Стр. {currentPage} из {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'var(--text-main)', opacity: currentPage >= totalPages ? 0.5 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Поиск по тексту */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-body)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Поиск по тексту..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 12, outline: 'none' }}
          />
        </div>
      </div>

      {/* Область чтения страницы */}
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: 'var(--bg-card)', margin: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', fontSize: 15, lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-main)' }}>
          {activePageData.text ? activePageData.text : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>На этой странице нет текстового слоя (возможно, это сканированное изображение).</span>}
        </div>
      </div>
    </div>
  );
};