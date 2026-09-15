import React, { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Checklist from '@editorjs/checklist';

interface EditorViewProps {
  data: any;
  onChange: (data: any) => void;
}

const ruI18n = {
  messages: {
    ui: {
      blockTunes: {
        toggler: { "Click to tune": "Нажмите для настройки", "or drag to move": "или перетащите" },
        "Convert to": "Преобразовать в"
      },
      inlineToolbar: { converter: { "Convert to": "Преобразовать в" } },
      toolbar: { toolbox: { "Add": "Добавить", "Filter": "Поиск блока" } },
      popover: { 
        "Filter": "Поиск...", 
        "Nothing found": "Ничего не найдено", 
        "Convert to": "Преобразовать в",
        "Start with": "Начать с",
        "Counter type": "Тип нумерации",
        "Numeric": "1. Числовой",
        "Lower Roman": "i. Римские (строчные)",
        "Upper Roman": "I. Римские (прописные)",
        "Lower Alpha": "a. Буквенные (строчные)",
        "Upper Alpha": "A. Буквенные (прописные)",
        "Checklist": "Чек-лист"
      }
    },
    toolNames: {
      "Text": "Параграф",
      "Heading": "Заголовок",
      "List": "Список",
      "Unordered": "Маркированный список",
      "Ordered": "Нумерованный список",
      "Checklist": "Чек-лист"
    },
    tools: {
      header: {
        "Heading 1": "Заголовок 1",
        "Heading 2": "Заголовок 2",
        "Heading 3": "Заголовок 3"
      },
      list: {
        "Unordered": "Маркированный список",
        "Ordered": "Нумерованный список",
        "Start with": "Начать с",
        "Counter type": "Тип нумерации",
        "Numeric": "1. Числовой",
        "Lower Roman": "i. Римские (строчные)",
        "Upper Roman": "I. Римские (прописные)",
        "Lower Alpha": "a. Буквенные (строчные)",
        "Upper Alpha": "A. Буквенные (прописные)"
      },
      checklist: {
        "Checklist": "Чек-лист"
      }
    },
    blockTunes: {
      delete: { "Delete": "Удалить" },
      moveUp: { "Move up": "Переместить вверх" },
      moveDown: { "Move down": "Переместить вниз" },
      "Convert to": "Преобразовать в"
    }
  }
};

export const EditorView: React.FC<EditorViewProps> = ({ data, onChange }) => {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const editorInstance = new EditorJS({
      holder: containerRef.current,
      placeholder: 'Нажмите Tab для выбора блока или начните ввод...',
      i18n: ruI18n,
      minHeight: 50,
      tools: {
        header: Header,
        list: List,
        checklist: Checklist
      },
      data: data || {},
      onChange: async () => {
        try {
          const content = await editorInstance.save();
          onChange(content);
        } catch {}
      }
    });

    editorRef.current = editorInstance;

    return () => {
      if (editorRef.current && typeof editorRef.current.destroy === 'function') {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [data]);

  return <div id="editorjs" ref={containerRef} />;
};