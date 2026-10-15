# Plantilla de reporte de defecto

Todo hallazgo de `mahp-qa-agent` o `mahp-security-auditor` usa este formato exacto.

```
ID:                 QA-NNN (consecutivo, ver docs/QA/REGISTRO.md)
Título:
Módulo:
Tipo:                Funcional | Visual | UX | Security | Performance
Severidad:           CRITICAL | HIGH | MEDIUM | LOW | INFO
Criterio de severidad: (una frase — por qué esta severidad y no otra)

Pasos para reproducir:
1.
2.
3.

Resultado esperado:
Resultado real:

Evidencia:
  Screenshot:
  Console error:
  Network error:

Archivo relacionado:
Causa probable:

Estado:              Abierto | En corrección | Corregido | No reproducible | Descartado (con motivo)
Corrección:          (qué se cambió, si aplica)
Resultado después de la corrección:  (se vuelve a probar, no se asume)
```

## Criterio de severidad (no arbitrario)

- **CRITICAL**: pérdida de datos, fuga de datos entre empresas (multi-tenant), o el sistema queda inutilizable.
- **HIGH**: el camino feliz de un flujo real (`docs/QA/01-FLUJOS-REALES.md`) falla.
- **MEDIUM**: falla solo en un caso borde razonable (campo vacío, permiso límite, dato duplicado).
- **LOW**: defecto cosmético pero visible al usuario.
- **INFO**: observación que no bloquea nada, para registro.
