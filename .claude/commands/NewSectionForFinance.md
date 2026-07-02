# New section for Finance
Agrega un apartado en Finanzas de análisis y simulación de inversiones enfocada inicialmente en FIBRAs mexicanas, utilizando datos reales obtenidos desde APIs financieras y combinándolos con un motor propio de simulación para ayudar a los usuarios a tomar decisiones de inversión.

## Objetivo

Permitir que un usuario responda preguntas como:

- Si invierto $100,000 en una FIBRA, ¿cuánto podría recibir en dividendos?
- ¿Cuánto generaría al mes, año o como promedio diario?
- ¿Qué pasa si reinvierto todos los dividendos?
- ¿Cuál FIBRA ofrece un mejor rendimiento histórico?
- ¿Cómo habría crecido mi inversión en los últimos 5 o 10 años?
- ¿Qué ocurriría si aporto una cantidad fija cada mes?

## Propuesta de valor

No solo mostrará datos financieros, sino que los transformará en simulaciones y visualizaciones fáciles de entender mediante:

- 📈 Gráficas de crecimiento del capital.
- 💰 Proyección de dividendos.
- 📊 Comparación entre diferentes FIBRAs.
- 🔄 Simulación con y sin reinversión.
- 📅 Estimaciones de ingresos mensuales y anuales.
- 📂 Historial y seguimiento de inversiones.

## Tecnologías

- Datos financieros: Yahoo Finance (endpoints no oficiales), con cobertura de tickers `.MX` de la BMV. Se descartan Alpha Vantage y Financial Modeling Prep para este caso por su cobertura limitada/nula de FIBRAs mexicanas en el tier gratuito.
- Motor de simulación: backend (Django), no en el navegador — permite reutilizar la lógica y persistir historial por usuario/organización.
- Gráficas: Recharts.

## Visión a futuro

Aunque la primera versión estará enfocada en FIBRAs mexicanas, la arquitectura permitirá incorporar posteriormente:

- Acciones nacionales e internacionales.
- ETFs.
- REITs de Estados Unidos.
- Criptomonedas.
- Fondos de inversión.
- Carteras de inversión personalizadas.

## Alcance de la primera versión (MVP)

Simulación simple (lump sum) con y sin reinversión, aportaciones periódicas (DCA), comparación entre FIBRAs, e historial de simulaciones persistido por organización. Ver el plan detallado de implementación para el diseño de backend/frontend.