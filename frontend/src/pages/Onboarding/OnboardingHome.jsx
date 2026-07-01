import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import styles from './Onboarding.module.css'

export function OnboardingHome() {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1>Bienvenido a AZ Cotizador</h1>
        <p>Todavía no pertenecés a ninguna organización. Elegí cómo querés empezar.</p>
      </div>
      <div className={styles.options}>
        <Card className={styles.option}>
          <h2>Crear una organización</h2>
          <p>Registrá tu empresa y empezá a cotizar como administrador.</p>
          <Link to="/onboarding/crear">
            <Button>Crear organización</Button>
          </Link>
        </Card>
        <Card className={styles.option}>
          <h2>Unirme a una organización</h2>
          <p>
            Si un administrador ya te invitó, revisá tu correo y abrí el link de
            invitación que recibiste para crear tu cuenta.
          </p>
          <Button variant="secondary" disabled>
            Esperar invitación por email
          </Button>
        </Card>
      </div>
    </div>
  )
}
