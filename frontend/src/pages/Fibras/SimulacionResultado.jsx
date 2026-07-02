import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card } from '../../components/ui/Card'
import styles from './Fibras.module.css'

const COLORES = ['#3498db', '#e67e22', '#9b59b6', '#2ecc71', '#e74c3c', '#1abc9c']

function formatMoneda(valor) {
  return `$${Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SimulacionResultado({ resultado }) {
  const tickers = Object.keys(resultado.resultados_por_fibra)
  const esComparacion = tickers.length > 1
  const serieUnica = !esComparacion ? resultado.resultados_por_fibra[tickers[0]].serie_valor : null

  return (
    <div>
      <div className={styles.statsGrid}>
        {tickers.map((ticker) => {
          const r = resultado.resultados_por_fibra[ticker]
          return (
            <Card key={ticker} className={styles.statTile}>
              <p className={styles.statLabel}>{ticker} — Valor final</p>
              <p className={styles.statValue}>{formatMoneda(r.valor_final)}</p>
              <p className={styles.statLabel}>Retorno total: {r.retorno_total_pct}% · Anualizado (aprox.): {r.retorno_anualizado_pct}%</p>
            </Card>
          )
        })}
      </div>

      <Card className={styles.chartCard}>
        <strong>Crecimiento del capital</strong>
        <ResponsiveContainer width="100%" height={300}>
          {esComparacion ? (
            <LineChart data={resultado.serie_comparacion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatMoneda(value)} />
              <Legend />
              {tickers.map((ticker, i) => (
                <Line key={ticker} type="monotone" dataKey={ticker} stroke={COLORES[i % COLORES.length]} dot={false} />
              ))}
            </LineChart>
          ) : (
            <LineChart data={serieUnica}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatMoneda(value)} />
              <Line type="monotone" dataKey="valor" name={tickers[0]} stroke={COLORES[0]} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </Card>

      <Card className={styles.chartCard}>
        <strong>Proyección de dividendos (promedio de los últimos 12 meses)</strong>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={tickers.map((ticker) => ({
              ticker,
              mensual: Number(resultado.resultados_por_fibra[ticker].proyeccion_dividendos.mensual_estimado),
              anual: Number(resultado.resultados_por_fibra[ticker].proyeccion_dividendos.anual_estimado),
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ticker" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatMoneda(value)} />
            <Legend />
            <Bar dataKey="mensual" name="Estimado mensual" fill="#3498db" />
            <Bar dataKey="anual" name="Estimado anual" fill="#2ecc71" />
          </BarChart>
        </ResponsiveContainer>
        <p className={styles.disclaimer}>
          Estimación retrospectiva basada en dividendos pagados en los últimos 12 meses, no garantiza pagos futuros.
        </p>
      </Card>
    </div>
  )
}
