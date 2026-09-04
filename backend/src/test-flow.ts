import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fyisfucgzpdwupjterlh.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_qSAiGoo7ZEGZ0IboqClunQ_NyJ8OnbY'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runTestFlow() {
  console.log('🔄 1. Autenticando usuário de testes...')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste.proxima@example.com',
    password: 'SenhaSegura123!',
  })

  if (authError || !authData.session) {
    console.error('❌ Erro na autenticação:', authError?.message)
    return
  }

  const token = authData.session.access_token
  const userId = authData.user.id

  console.log('✅ Autenticado com sucesso!')
  console.log('🆔 User ID:', userId)

  console.log('\n🔄 2. Testando Rota Protegida (POST /checkins)...')

  const checkinResponse = await fetch('http://127.0.0.1:3333/checkins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      business_id: '1cf67441-0c9c-4a92-9906-b34c93b014d5',
    }),
  })

  const checkinResult = await checkinResponse.json()

  console.log('📊 Status Check-in:', checkinResponse.status)
  console.log('📦 Resposta Check-in:', JSON.stringify(checkinResult, null, 2))

  console.log('\n🔄 3. Consultando Saldo do Usuário (GET /users/:id/points)...')

  const pointsResponse = await fetch(`http://127.0.0.1:3333/users/${userId}/points`)
  const pointsResult = await pointsResponse.json()

  console.log('📊 Status Pontos:', pointsResponse.status)
  console.log('📦 Extrato e Saldo:', JSON.stringify(pointsResult, null, 2))
}

// Execução do fluxo de testes
runTestFlow()
