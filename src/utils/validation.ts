import type { Diagram, ValidationIssue, Table, Column } from '@/types';

const numericFamilies = ['INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'FLOAT', 'DOUBLE'];
const textFamilies = ['VARCHAR', 'TEXT', 'LONGTEXT', 'CHAR', 'UUID'];
const dateFamilies = ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'];

export function validateDiagram(diagram: Diagram): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tables = diagram.nodes.map((node) => node.data.table);
  const tableMap = new Map(tables.map((table) => [table.id, table]));

  for (const table of tables) {
    const pkColumns = table.columns.filter((column) => column.isPrimaryKey);
    if (pkColumns.length === 0) {
      issues.push({
        id: `table-${table.id}-no-pk`,
        severity: 'warning',
        tableId: table.id,
        message: `La tabla "${table.name}" no tiene Clave Primaria (PK). Abre la tabla, selecciona la columna identificadora y activa el icono de llave (PK).`,
      });
    }

    const names = new Set<string>();
    for (const column of table.columns) {
      const normalized = column.name.trim().toLowerCase();
      if (names.has(normalized)) {
        issues.push({
          id: `col-${column.id}-duplicate`,
          severity: 'error',
          tableId: table.id,
          columnId: column.id,
          message: `Columna duplicada: "${column.name}" aparece más de una vez en la tabla "${table.name}". Cambia el nombre de una de las dos columnas.`,
        });
      }
      names.add(normalized);

      if (column.isPrimaryKey && column.isNullable) {
        issues.push({
          id: `col-${column.id}-pk-nullable`,
          severity: 'error',
          tableId: table.id,
          columnId: column.id,
          message: `La Clave Primaria "${column.name}" en la tabla "${table.name}" acepta valores NULL, lo cual no está permitido. Abre la tabla y desactiva la opción "Nullable" (NN) en esa columna.`,
        });
      }

      if (column.isForeignKey && !column.references) {
        // Only report if no relation edge already covers this column as target.
        // A manually-toggled FK on a column that has an edge is not an issue.
        const coveredByEdge = diagram.edges.some(
          (edge) => edge.target === table.id && edge.data?.targetColumnId === column.id
        );
        if (!coveredByEdge) {
          issues.push({
            id: `col-${column.id}-fk-no-ref`,
            severity: 'error',
            tableId: table.id,
            columnId: column.id,
            message: `La columna "${column.name}" de la tabla "${table.name}" está marcada como FK pero no tiene ninguna relación creada. Arrastra una conexión desde esta columna hacia la columna PK de la tabla destino, o desmarca el indicador FK si fue un error.`,
          });
        }
      }
    }
  }

  for (const edge of diagram.edges) {
    if (!edge.data) continue;
    const parent = tableMap.get(edge.source);
    const child = tableMap.get(edge.target);
    if (!parent || !child) continue;

    const parentColumn = parent.columns.find((column) => column.id === edge.data!.sourceColumnId);
    const childColumn = child.columns.find((column) => column.id === edge.data!.targetColumnId);
    if (!parentColumn || !childColumn) {
      issues.push({
        id: `edge-${edge.id}-missing-column`,
        severity: 'error',
        edgeId: edge.id,
        message: `La relación "${edge.data.label ?? edge.id}" apunta a una columna que ya no existe. Elimina esta relación y vuélvela a crear.`,
      });
      continue;
    }

    if (!parentColumn.isPrimaryKey && !parentColumn.isUnique) {
      issues.push({
        id: `edge-${edge.id}-source-not-key`,
        severity: 'error',
        edgeId: edge.id,
        tableId: parent.id,
        columnId: parentColumn.id,
        message: `La columna "${parentColumn.name}" de la tabla "${parent.name}" se usa como origen de una relación pero no está marcada como PK ni como UNIQUE. Las relaciones deben partir de una columna clave.`,
      });
    }

    if (!childColumn.isForeignKey) {
      issues.push({
        id: `edge-${edge.id}-target-not-fk`,
        severity: 'warning',
        edgeId: edge.id,
        tableId: child.id,
        columnId: childColumn.id,
        message: `La columna "${childColumn.name}" de la tabla "${child.name}" participa en una relación pero no tiene el indicador FK activado. Abre la tabla y marca esa columna como FK.`,
      });
    }

    if (!areTypesCompatible(parentColumn, childColumn)) {
      issues.push({
        id: `edge-${edge.id}-type-mismatch`,
        severity: 'error',
        edgeId: edge.id,
        message: `Tipos incompatibles en la relación: "${parent.name}.${parentColumn.name}" es ${parentColumn.type} pero "${child.name}.${childColumn.name}" es ${childColumn.type}. Ambas columnas deben ser del mismo tipo para que la clave foránea funcione correctamente.`,
      });
    }
  }

  return issues;
}

export function getTableValidationLevel(diagram: Diagram, tableId: string): 'error' | 'warning' | 'ok' {
  const issues = validateDiagram(diagram).filter((issue) => issue.tableId === tableId);
  if (issues.some((issue) => issue.severity === 'error')) return 'error';
  if (issues.some((issue) => issue.severity === 'warning')) return 'warning';
  return 'ok';
}

function areTypesCompatible(parent: Column, child: Column): boolean {
  if (parent.type === child.type) return true;
  return family(parent.type) === family(child.type);
}

function family(type: string): string {
  const upper = type.toUpperCase();
  if (numericFamilies.some((item) => upper.startsWith(item))) return 'numeric';
  if (textFamilies.some((item) => upper.startsWith(item))) return 'text';
  if (dateFamilies.some((item) => upper.startsWith(item))) return 'date';
  return upper;
}
