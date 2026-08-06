# BitScribe Suite - Tailwind & Styling Spec

## Base Styles (`index.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-[#08090C] text-slate-200 antialiased;
  }
}

@layer utilities {
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    @apply bg-slate-700/50 rounded-full;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    @apply bg-slate-600;
  }
}
```

## Shared Components & Layout Rules
- **Panels/Cards:** Typically use `bg-[#14171F] border border-[#1e232e] rounded-xl shadow-lg`.
- **Inner Panels/Insects:** Typically use `bg-[#0F1117] border border-[#1e232e] rounded-lg shadow-inner`.
- **Primary Buttons:** `bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded px-4 py-2 transition-colors flex items-center gap-2`.
- **Secondary Buttons:** `bg-[#2a2a35] hover:bg-[#353545] text-slate-300 font-semibold rounded px-4 py-2 transition-colors flex items-center gap-2`.
- **Headers:** H2 typically `text-xl font-bold text-slate-100 flex items-center gap-2`.
- **Subtext:** `text-sm text-slate-400 mt-1`.
