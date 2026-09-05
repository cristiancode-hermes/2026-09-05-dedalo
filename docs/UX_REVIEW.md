# UX/UI Review — Dédalo

## Resumen
Revisión 1×1 del FS laberinto de espejos (live `dedalo.proyectos.cristiancode.dev`, 5 sept). Diseño no bloqueado (`isFinalDesign` ausente). Identidad «Azogue» (Sora + Figtree, `#145C4E` / `#3DA892`) se mantiene; se corrigen login/registro, kickers en inglés/slug, featured débil y ticks del chart.

## Mejoras implementadas
1. **Login/registro underline** — el `min-height: 44px` dejaba un hueco muerto entre etiqueta y raya. Campos más compactos, CTA a ancho completo, formulario centrado en viewport.
2. **Toggle de tema en auth** — registro no tenía toggle; ahora login y registro lo anclan fijo arriba-derecha (icono ☀/☾ + `aria-label`).
3. **Credenciales demo** — staff ya no parte el `· demo1234` en una línea suelta a 390px.
4. **Kickers en español** — detalle dejaba el slug (`espejo-mayor`); checkout decía `Checkout`; admin decía `Admin` → Circuito / Taquilla / Taller.
5. **Captions sin repetir el nombre** — «Azogue corto — circuito…» + h3 «Azogue corto» era redundante. La figcaption queda en el aside.
6. **Hero = Espejo Mayor** — el listado va por nombre ASC y el featured era el circuito de aprendizaje.
7. **Chart staff** — ticks Y enteros únicos (evita `0,1,1,1` cuando max≤4).

## Paleta de colores
| Token | Light | Dark | Uso |
|---|---|---|---|
| `primary` | `#145C4E` | `#3DA892` | Botones, enlaces |
| `on-primary` | `#F4F5F7` | `#0E1216` | Label CTA (7.21 / hover 9.29 light; 6.46 / 5.08 dark) |
| `ink` | `#14181F` | `#E8EAED` | Títulos, cards |
| `muted` | `#4A5560` | `#9AA3AE` | Meta (≥6.7:1) |
| `accent` | `#B45309` | `#E0A15A` | Kicker, precio (4.60 light) |

## Notas de accesibilidad
- Contraste-hover de `.btn-primary` intacto (`color: var(--color-on-primary)`).
- `a:hover:not(.btn)` no pinta el label del CTA.
- Theme toggle: icono + aria-label, no texto «Claro/Oscuro».
- Login layout 2 (minimalista sin caja) se conserva — rotación de specs.
- 390px: sin overflow horizontal en home/login.

## Pendiente para futura iteración
- [ ] Toggle de tema con icono SVG en lugar de emoji.
- [ ] Ilustraciones SVG a mayor densidad en el recorte 16:9.
