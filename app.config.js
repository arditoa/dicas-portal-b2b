// Configuração dinâmica do app. Lê o app.json e acrescenta, SÓ no build,
// a chave do Google Maps do Android (necessária para o mapa aparecer no
// Android). A chave NÃO fica no código: vem da variável de ambiente
// GOOGLE_MAPS_ANDROID_API_KEY (EAS) — ver passo a passo no chat/projeto.
module.exports = ({ config }) => {
  const chave = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  if (!chave) return config;
  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        googleMaps: { apiKey: chave },
      },
    },
  };
};
