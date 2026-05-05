# ERD Modeler Pro

Aplicación web profesional para modelado físico de bases de datos, inspirada en herramientas como Navicat Data Modeler.

## Características implementadas

- Creación de tablas desde toolbar y por drag & drop desde el panel izquierdo.
- Edición inline de nombre de tabla, nombre de columna y tipo de dato directamente en el nodo.
- Editor lateral tipo propiedades para tablas, columnas y relaciones.
- Columnas con PK, FK, NN, AI, UNIQUE, default y comentarios.
- Relaciones visuales con React Flow y notación Crow's Foot.
- Creación inteligente de FK al conectar columnas/tablas.
- Detección automática de FK al crear relaciones: si falta columna hija, se crea una columna FK compatible.
- Configuración de relaciones:
  - One-to-One
  - One-to-Many
  - Many-to-Many con generación automática de tabla intermedia
  - ON DELETE
  - ON UPDATE
  - Nombre de constraint / FK
  - Reasignación visual de columnas padre/hija
- Tabla puente para N:M con claves compuestas.
- Validación visual del modelo:
  - Tabla sin PK
  - FK sin referencia
  - PK nullable
  - Tipos incompatibles
  - Columnas duplicadas
- Resaltado visual de tablas con errores o advertencias.
- Agrupación por schema/dominio.
- Colores por tabla/módulo.
- Mini-map, zoom, pan, snap-to-grid y navegación fluida.
- Auto-layout básico.
- Exportación/importación JSON.
- Exportación PNG/SVG.
- Generación SQL DDL con `CREATE TABLE` y `ALTER TABLE`.
- Tema claro/oscuro.

## Stack técnico

- React + TypeScript
- Vite
- React Flow (`@xyflow/react`)
- Zustand
- Tailwind CSS
- Radix UI
- html-to-image
- lucide-react

## Arquitectura

```txt
src/
├── components/
│   ├── Canvas/
│   │   ├── Canvas.tsx
│   │   ├── TableNode.tsx
│   │   └── RelationEdge.tsx
│   ├── Properties/
│   │   └── PropertiesPanel.tsx
│   ├── Sidebar/
│   │   └── Sidebar.tsx
│   ├── Toolbar/
│   │   └── Toolbar.tsx
│   └── UI/
├── constants/
├── hooks/
├── lib/
├── store/
│   ├── diagram-store.ts
│   └── ui-store.ts
├── types/
│   └── erd.ts
└── utils/
    ├── export.ts
    ├── factories.ts
    ├── sql-generator.ts
    └── validation.ts
```

## Instalación

```bash
npm install
npm run dev
```

Si estás usando Node 24 y npm 11 y aparece `Exit handler never called`, usa Node 22 LTS o pnpm:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm dev
```

## Uso rápido

- Arrastra **Drag table to canvas** desde el sidebar para crear una tabla.
- Haz doble clic sobre el nombre de tabla o columna para editar inline.
- Cambia el tipo de dato desde el selector dentro del nodo.
- Arrastra desde el handle derecho de una columna padre hacia el handle izquierdo de una tabla/columna hija para crear relación.
- Cambia una relación a **N — M** en el panel lateral para generar automáticamente la tabla puente.
- Usa **SQL Preview** para ver el DDL generado.
