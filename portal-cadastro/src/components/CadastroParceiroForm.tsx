import { useEffect, useState, type FormEvent } from 'react';
import { copy } from '../copy';
import { enviarCadastroParceiro, verificarDocumentoDuplicado } from '../lib/api';
import { buscarEnderecoPorCEP, CepNaoEncontradoError, formatarCEP } from '../lib/cep';
import {
    apenasDigitos as apenasDigitosDoc,
    detectarTipoDocumento,
    formatarDocumento,
    validarDocumento,
} from '../lib/documento';
import { buscarDadosCNPJ, CnpjNaoEncontradoError, type DadosCNPJ } from '../lib/lookupCnpj';
import { formatarWhatsApp, linkCadastroPorWhatsApp, linkFalarSobreDuplicidade } from '../lib/whatsapp';
import './CadastroParceiroForm.css';

type StatusBusca = 'ocioso' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro';
type StatusEnvio = 'ocioso' | 'enviando' | 'sucesso' | 'duplicado' | 'erro';

interface FormState {
  documento: string;
  nomeResponsavel: string;
  nomeEspaco: string;
  categoria: string;
  whatsapp: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  aceitouTermos: boolean;
}

const ESTADO_INICIAL: FormState = {
  documento: '',
  nomeResponsavel: '',
  nomeEspaco: '',
  categoria: '',
  whatsapp: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  aceitouTermos: false,
};

export function CadastroParceiroForm() {
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [erros, setErros] = useState<Partial<Record<keyof FormState, string>>>({});
  const [statusDocumento, setStatusDocumento] = useState<StatusBusca>('ocioso');
  const [situacaoCadastral, setSituacaoCadastral] = useState<string | null>(null);
  const [statusCep, setStatusCep] = useState<StatusBusca>('ocioso');
  const [statusEnvio, setStatusEnvio] = useState<StatusEnvio>('ocioso');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const whatsappDaURL = params.get('whatsapp');
    if (whatsappDaURL) {
      setForm((atual) => ({ ...atual, whatsapp: formatarWhatsApp(whatsappDaURL) }));
    }
  }, []);

  function atualizarCampo<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function preencherComDadosCNPJ(dados: DadosCNPJ) {
    setForm((atual) => ({
      ...atual,
      nomeEspaco: atual.nomeEspaco || dados.nomeFantasia,
      cep: atual.cep || formatarCEP(dados.cep),
      logradouro: atual.logradouro || dados.logradouro,
      bairro: atual.bairro || dados.bairro,
      cidade: atual.cidade || dados.cidade,
      uf: atual.uf || dados.uf,
    }));
  }

  async function aoMudarDocumento(valorDigitado: string) {
    const formatado = formatarDocumento(valorDigitado);
    atualizarCampo('documento', formatado);
    setSituacaoCadastral(null);

    const tipo = detectarTipoDocumento(formatado);
    if (!tipo || !validarDocumento(formatado)) {
      setStatusDocumento('ocioso');
      return;
    }
    if (tipo === 'cpf') {
      setStatusDocumento('ocioso');
      return;
    }

    setStatusDocumento('buscando');
    try {
      const digitos = apenasDigitosDoc(formatado);
      const dados = await buscarDadosCNPJ(digitos);
      preencherComDadosCNPJ(dados);
      setStatusDocumento('encontrado');
      if (dados.situacaoCadastral && !/ativa/i.test(dados.situacaoCadastral)) {
        setSituacaoCadastral(dados.situacaoCadastral);
      }
    } catch (erro) {
      setStatusDocumento(erro instanceof CnpjNaoEncontradoError ? 'nao_encontrado' : 'erro');
    }
  }

  async function aoMudarCep(valorDigitado: string) {
    const formatado = formatarCEP(valorDigitado);
    atualizarCampo('cep', formatado);
    const digitos = formatado.replace(/\D/g, '');
    if (digitos.length !== 8) {
      setStatusCep('ocioso');
      return;
    }
    setStatusCep('buscando');
    try {
      const endereco = await buscarEnderecoPorCEP(digitos);
      setForm((atual) => ({
        ...atual,
        logradouro: endereco.logradouro || atual.logradouro,
        bairro: endereco.bairro || atual.bairro,
        cidade: endereco.cidade || atual.cidade,
        uf: endereco.uf || atual.uf,
      }));
      setStatusCep('encontrado');
    } catch (erro) {
      setStatusCep(erro instanceof CepNaoEncontradoError ? 'nao_encontrado' : 'erro');
    }
  }

  function validarAntesDeEnviar(): boolean {
    const proximosErros: Partial<Record<keyof FormState, string>> = {};
    if (!validarDocumento(form.documento)) proximosErros.documento = copy.documento.erroInvalido;
    if (!form.nomeResponsavel.trim()) proximosErros.nomeResponsavel = 'Campo obrigatório';
    if (!form.nomeEspaco.trim()) proximosErros.nomeEspaco = 'Campo obrigatório';
    if (!form.categoria) proximosErros.categoria = 'Campo obrigatório';
    if (apenasDigitosDoc(form.whatsapp).length < 10) proximosErros.whatsapp = copy.whatsapp.erroInvalido;
    if (!form.numero.trim()) proximosErros.numero = 'Campo obrigatório';
    if (!form.aceitouTermos) proximosErros.aceitouTermos = copy.termos.erro;

    setErros(proximosErros);
    return Object.keys(proximosErros).length === 0;
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!validarAntesDeEnviar()) return;

    setStatusEnvio('enviando');
    const documentoDigitos = apenasDigitosDoc(form.documento);

    try {
      const jaExiste = await verificarDocumentoDuplicado(documentoDigitos);
      if (jaExiste) {
        setStatusEnvio('duplicado');
        return;
      }
      await enviarCadastroParceiro({
        documento: documentoDigitos,
        nomeResponsavel: form.nomeResponsavel,
        whatsapp: apenasDigitosDoc(form.whatsapp),
        nomeEspaco: form.nomeEspaco,
        categoria: form.categoria,
        cep: apenasDigitosDoc(form.cep),
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento || undefined,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.uf,
        aceitouTermos: form.aceitouTermos,
        origemLead: new URLSearchParams(window.location.search).get('whatsapp') ? 'whatsapp' : 'portal',
      });
      setStatusEnvio('sucesso');
    } catch {
      setStatusEnvio('erro');
    }
  }

  if (statusEnvio === 'sucesso') {
    return (
      <div className="cadastro-parceiro cadastro-parceiro--sucesso">
        <h1>{copy.sucesso.titulo}</h1>
        <p>{copy.sucesso.corpo}</p>
        <a className="cadastro-parceiro__link-whatsapp" href={linkCadastroPorWhatsApp()}>
          {copy.sucesso.ajuda}
        </a>
      </div>
    );
  }

  return (
    <form className="cadastro-parceiro" onSubmit={aoEnviar} noValidate>
      <header className="cadastro-parceiro__cabecalho">
        <h1>{copy.pagina.titulo}</h1>
        <p>{copy.pagina.lede}</p>
        <a className="cadastro-parceiro__entrada-whatsapp" href={linkCadastroPorWhatsApp()}>
          {copy.entradaWhatsApp.botao}
        </a>
      </header>

      <div className="campo">
        <label htmlFor="documento">{copy.documento.label}</label>
        <input
          id="documento"
          inputMode="numeric"
          placeholder={copy.documento.placeholder}
          value={form.documento}
          onChange={(e) => aoMudarDocumento(e.target.value)}
        />
        <p className="campo__ajuda">{copy.documento.ajuda}</p>
        {statusDocumento === 'buscando' && <p className="campo__status">{copy.documento.buscando}</p>}
        {statusDocumento === 'encontrado' && (
          <p className="campo__status campo__status--ok">{copy.documento.encontrado}</p>
        )}
        {statusDocumento === 'nao_encontrado' && <p className="campo__status">{copy.documento.naoEncontrado}</p>}
        {situacaoCadastral && <p className="campo__aviso">{copy.documento.situacaoIrregular(situacaoCadastral)}</p>}
        {erros.documento && <p className="campo__erro">{erros.documento}</p>}
      </div>

      <div className="campo">
        <label htmlFor="nomeResponsavel">{copy.responsavel.label}</label>
        <input
          id="nomeResponsavel"
          placeholder={copy.responsavel.placeholder}
          value={form.nomeResponsavel}
          onChange={(e) => atualizarCampo('nomeResponsavel', e.target.value)}
        />
        {erros.nomeResponsavel && <p className="campo__erro">{erros.nomeResponsavel}</p>}
      </div>

      <div className="campo">
        <label htmlFor="nomeEspaco">{copy.espaco.labelNome}</label>
        <input
          id="nomeEspaco"
          placeholder={copy.espaco.placeholderNome}
          value={form.nomeEspaco}
          onChange={(e) => atualizarCampo('nomeEspaco', e.target.value)}
        />
        {erros.nomeEspaco && <p className="campo__erro">{erros.nomeEspaco}</p>}
      </div>

      <div className="campo">
        <label htmlFor="categoria">{copy.espaco.labelCategoria}</label>
        <select id="categoria" value={form.categoria} onChange={(e) => atualizarCampo('categoria', e.target.value)}>
          <option value="">Selecione</option>
          {copy.espaco.categorias.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
        {erros.categoria && <p className="campo__erro">{erros.categoria}</p>}
      </div>

      <div className="campo">
        <label htmlFor="whatsapp">{copy.whatsapp.label}</label>
        <input
          id="whatsapp"
          inputMode="numeric"
          placeholder={copy.whatsapp.placeholder}
          value={form.whatsapp}
          onChange={(e) => atualizarCampo('whatsapp', formatarWhatsApp(e.target.value))}
        />
        <p className="campo__ajuda">{copy.whatsapp.ajuda}</p>
        {erros.whatsapp && <p className="campo__erro">{erros.whatsapp}</p>}
      </div>

      <fieldset className="cadastro-parceiro__endereco">
        <legend>Endereço do espaço</legend>
        <div className="campo">
          <label htmlFor="cep">{copy.endereco.labelCep}</label>
          <input
            id="cep"
            inputMode="numeric"
            placeholder={copy.endereco.placeholderCep}
            value={form.cep}
            onChange={(e) => aoMudarCep(e.target.value)}
          />
          <p className="campo__ajuda">{copy.endereco.ajudaCep}</p>
          {statusCep === 'buscando' && <p className="campo__status">{copy.endereco.buscandoCep}</p>}
          {statusCep === 'nao_encontrado' && <p className="campo__status">{copy.endereco.cepNaoEncontrado}</p>}
        </div>
        <div className="campo">
          <label htmlFor="logradouro">{copy.endereco.labelLogradouro}</label>
          <input
            id="logradouro"
            value={form.logradouro}
            onChange={(e) => atualizarCampo('logradouro', e.target.value)}
          />
        </div>
        <div className="cadastro-parceiro__linha">
          <div className="campo campo--numero">
            <label htmlFor="numero">{copy.endereco.labelNumero}</label>
            <input id="numero" value={form.numero} onChange={(e) => atualizarCampo('numero', e.target.value)} />
            {erros.numero && <p className="campo__erro">{erros.numero}</p>}
          </div>
          <div className="campo">
            <label htmlFor="complemento">{copy.endereco.labelComplemento}</label>
            <input
              id="complemento"
              value={form.complemento}
              onChange={(e) => atualizarCampo('complemento', e.target.value)}
            />
          </div>
        </div>
        <div className="cadastro-parceiro__linha">
          <div className="campo">
            <label htmlFor="bairro">{copy.endereco.labelBairro}</label>
            <input id="bairro" value={form.bairro} onChange={(e) => atualizarCampo('bairro', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="cidade">{copy.endereco.labelCidade}</label>
            <input id="cidade" value={form.cidade} onChange={(e) => atualizarCampo('cidade', e.target.value)} />
          </div>
          <div className="campo campo--uf">
            <label htmlFor="uf">{copy.endereco.labelUf}</label>
            <input
              id="uf"
              maxLength={2}
              value={form.uf}
              onChange={(e) => atualizarCampo('uf', e.target.value.toUpperCase())}
            />
          </div>
        </div>
      </fieldset>

      <div className="campo campo--checkbox">
        <label>
          <input
            type="checkbox"
            checked={form.aceitouTermos}
            onChange={(e) => atualizarCampo('aceitouTermos', e.target.checked)}
          />
          {copy.termos.label}
        </label>
        {erros.aceitouTermos && <p className="campo__erro">{erros.aceitouTermos}</p>}
      </div>

      {statusEnvio === 'duplicado' && (
        <p className="cadastro-parceiro__erro-envio">
          {copy.envio.duplicado} <a href={linkFalarSobreDuplicidade()}>{copy.envio.duplicadoAcao}</a>
        </p>
      )}
      {statusEnvio === 'erro' && <p className="cadastro-parceiro__erro-envio">{copy.envio.erroGenerico}</p>}

      <button type="submit" disabled={statusEnvio === 'enviando'}>
        {statusEnvio === 'enviando' ? copy.envio.botaoEnviando : copy.envio.botao}
      </button>
    </form>
  );
}