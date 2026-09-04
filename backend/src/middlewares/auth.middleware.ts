import { createClient } from '@supabase/supabase-js'
import { FastifyReply, FastifyRequest } from 'fastify'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseSecret)

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader) {
    return reply.status(401).send({ message: 'Token de autorização não fornecido.' })
  }

  const token = authHeader.replace('Bearer ', '').trim()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return reply.status(401).send({ message: 'Token de acesso inválido ou expirado.' })
  }

  request.user = {
    id: user.id,
    sub: user.id,
    email: user.email || '',
  }
}