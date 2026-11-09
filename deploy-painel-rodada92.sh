#!/bin/bash
# Rodada 92 — Aprovações com filas no menu lateral (Quer assinar plano, Locais novos, Festas e eventos,
# Pedidos de vínculo, Contatos institucionais, Hospedagens e pontos, Enviar acesso ao portal).
cd "$(dirname "$0")" || exit 1
git add portal-b2b-lgbt/src/app/admin/page.tsx
git status --short | grep -E '^(A|M)'
read -p "Subir? (s/n) " r
if [ "$r" = "s" ]; then
  git commit -m "Portal: filas de Aprovacoes viram itens do menu lateral, cada uma com contador

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RJ3r6vr1pLNorHoYNCwK1d" && git push
fi
