// Traduz os erros do Supabase Auth (que chegam em inglês) para mensagens
// claras em português. Nunca devolve texto técnico cru para a pessoa.
export function traduzErroAuth(err: any): string {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Você ainda não confirmou seu e-mail. Abra a mensagem de confirmação que enviamos e toque no link.';
  }
  if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Já existe uma conta com esse e-mail. Toque em "Já tem uma conta? Entrar".';
  }
  if (code === 'weak_password' || msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (code === 'validation_failed' || msg.includes('invalid format') || msg.includes('unable to validate email') || msg.includes('invalid email')) {
    return 'E-mail inválido. Confira se digitou certo.';
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    msg.includes('rate limit') ||
    msg.includes('for security purposes') ||
    err?.status === 429
  ) {
    return 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.';
  }
  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('network error')) {
    return 'Sem conexão com a internet. Verifique e tente de novo.';
  }
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) {
    return 'Novos cadastros estão temporariamente indisponíveis. Tente mais tarde.';
  }
  return 'Não foi possível concluir agora. Tente novamente em instantes.';
}
