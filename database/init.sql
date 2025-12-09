--
-- PostgreSQL database dump
--

\restrict wCVe28zb287boq3qJc3mXJMO16HD3ra0ADDtmsWjVu5xuogPtshvBq3xogJwhUi

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: atualizar_timestamp_atualizacao(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_timestamp_atualizacao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.atualizado_em = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$;


--
-- Name: set_motorista_id_from_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_motorista_id_from_usuario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
          IF NEW.motorista_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
            NEW.motorista_id := NEW.usuario_id;
          END IF;
          RETURN NEW;
        END;
        $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.atualizado_em = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


--
-- Name: sync_tipo_conferencia_to_evento(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_tipo_conferencia_to_evento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.tipo_evento IS NULL AND NEW.tipo_conferencia IS NOT NULL THEN
        NEW.tipo_evento := NEW.tipo_conferencia;
      END IF;
      RETURN NEW;
    END;
    $$;


--
-- Name: sync_veiculo_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_veiculo_usuario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    has_usuario boolean := to_jsonb(NEW) ? 'usuario_id';
    has_motorista boolean := to_jsonb(NEW) ? 'motorista_id';
BEGIN
    IF has_motorista AND has_usuario THEN
        IF NEW.usuario_id IS NULL AND NEW.motorista_id IS NOT NULL THEN
            NEW.usuario_id := NEW.motorista_id;
        END IF;

        IF NEW.motorista_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
            NEW.motorista_id := NEW.usuario_id;
        END IF;
    END IF;

    RETURN NEW;
END;

$$;


--
-- Name: sync_viagens_ativas_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_viagens_ativas_usuario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF NEW.usuario_id IS NULL AND NEW.motorista_id IS NOT NULL THEN

        NEW.usuario_id := NEW.motorista_id;

    END IF;

    IF NEW.motorista_id IS NULL AND NEW.usuario_id IS NOT NULL THEN

        NEW.motorista_id := NEW.usuario_id;

    END IF;

    RETURN NEW;

END;

$$;


--
-- Name: update_notification_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alertas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alertas (
    id integer NOT NULL,
    tipo character varying(50) NOT NULL,
    titulo character varying(255) NOT NULL,
    mensagem text,
    nivel character varying(50) DEFAULT 'info'::character varying,
    usuario_id integer,
    viagem_id integer,
    lido boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: alertas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.alertas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.alertas_id_seq OWNED BY public.alertas.id;


--
-- Name: arquivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arquivos (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    tipo character varying(100) NOT NULL,
    tamanho integer NOT NULL,
    caminho character varying(255) NOT NULL,
    entidade_tipo character varying(50),
    entidade_id integer,
    usuario_id integer,
    publico boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: arquivos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.arquivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: arquivos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.arquivos_id_seq OWNED BY public.arquivos.id;


--
-- Name: assinaturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assinaturas (
    id integer NOT NULL,
    usuario_id integer,
    plano_id integer,
    data_inicio date DEFAULT CURRENT_DATE NOT NULL,
    data_fim date,
    status character varying(50) DEFAULT 'ativa'::character varying,
    valor_pago numeric(10,2),
    forma_pagamento character varying(50),
    recorrente boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: assinaturas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assinaturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assinaturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assinaturas_id_seq OWNED BY public.assinaturas.id;


--
-- Name: avaliacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avaliacoes (
    id integer NOT NULL,
    avaliador_id integer,
    avaliado_id integer,
    nota integer NOT NULL,
    comentario text,
    anonimo boolean DEFAULT false,
    aprovado boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT avaliacoes_nota_check CHECK (((nota >= 1) AND (nota <= 5)))
);


--
-- Name: avaliacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.avaliacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: avaliacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.avaliacoes_id_seq OWNED BY public.avaliacoes.id;


--
-- Name: cache_localizacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_localizacao (
    id integer NOT NULL,
    motorista_id integer,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50),
    viagem_ativa_id integer,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cache_localizacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cache_localizacao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cache_localizacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cache_localizacao_id_seq OWNED BY public.cache_localizacao.id;


--
-- Name: caracteristicas_veiculos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caracteristicas_veiculos (
    id integer NOT NULL,
    veiculo_id integer,
    ar_condicionado boolean DEFAULT false,
    wifi boolean DEFAULT false,
    acessibilidade_pcd boolean DEFAULT false,
    gps_rastreamento boolean DEFAULT false,
    banheiro boolean DEFAULT false,
    tv_dvd boolean DEFAULT false,
    frigobar boolean DEFAULT false,
    poltronas_reclinaveis boolean DEFAULT false,
    cinto_seguranca boolean DEFAULT true,
    extintor boolean DEFAULT true,
    kit_primeiros_socorros boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: caracteristicas_veiculos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.caracteristicas_veiculos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: caracteristicas_veiculos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.caracteristicas_veiculos_id_seq OWNED BY public.caracteristicas_veiculos.id;


--
-- Name: checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkins (
    id integer NOT NULL,
    crianca_id integer,
    motorista_id integer,
    tipo character varying(50) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    latitude numeric(10,8),
    longitude numeric(11,8),
    confirmado_por character varying(50),
    observacoes text
);


--
-- Name: checkins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkins_id_seq OWNED BY public.checkins.id;


--
-- Name: conferencia_criancas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conferencia_criancas (
    id integer NOT NULL,
    viagem_id integer NOT NULL,
    crianca_id integer NOT NULL,
    tipo_evento character varying(15),
    horario_previsto timestamp with time zone,
    horario_real timestamp with time zone,
    latitude numeric(10,8),
    longitude numeric(11,8),
    endereco text,
    confirmado boolean DEFAULT false,
    observacoes text,
    notificacao_enviada boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_conferencia character varying(50),
    responsavel_conferencia_id integer,
    CONSTRAINT conferencia_criancas_tipo_evento_check CHECK ((((COALESCE(tipo_conferencia, tipo_evento))::text ~ '^(embarque|desembarque)'::text) OR (COALESCE(tipo_conferencia, tipo_evento) IS NULL)))
);


--
-- Name: conferencia_criancas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conferencia_criancas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conferencia_criancas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conferencia_criancas_id_seq OWNED BY public.conferencia_criancas.id;


--
-- Name: conferencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conferencias (
    id integer NOT NULL,
    motorista_id integer,
    rota_id integer,
    tipo_conferencia character varying(20) NOT NULL,
    data_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    data_fim timestamp with time zone,
    status character varying(20) DEFAULT 'em_andamento'::character varying,
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conferencias_status_check CHECK (((status)::text = ANY ((ARRAY['em_andamento'::character varying, 'finalizada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT conferencias_tipo_conferencia_check CHECK (((tipo_conferencia)::text = ANY ((ARRAY['ida'::character varying, 'volta'::character varying, 'completa'::character varying])::text[])))
);


--
-- Name: conferencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conferencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conferencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conferencias_id_seq OWNED BY public.conferencias.id;


--
-- Name: configuracoes_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes_sistema (
    id integer NOT NULL,
    chave character varying(100) NOT NULL,
    valor text,
    tipo character varying(50),
    descricao text,
    modificado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: configuracoes_sistema_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracoes_sistema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracoes_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracoes_sistema_id_seq OWNED BY public.configuracoes_sistema.id;


--
-- Name: contatos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contatos (
    id integer NOT NULL,
    usuario_id integer,
    nome character varying(255) NOT NULL,
    email character varying(255),
    telefone character varying(20),
    tipo character varying(50),
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: contatos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contatos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contatos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contatos_id_seq OWNED BY public.contatos.id;


--
-- Name: cotacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotacoes (
    id integer NOT NULL,
    solicitante_id integer,
    prestador_id integer,
    tipo_servico character varying(50),
    descricao_servico text,
    data_inicio date,
    data_fim date,
    numero_passageiros integer,
    endereco_origem text,
    endereco_destino text,
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cotacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotacoes_id_seq OWNED BY public.cotacoes.id;


--
-- Name: criancas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criancas (
    id integer NOT NULL,
    nome_completo character varying(255) NOT NULL,
    cpf character varying(20) NOT NULL,
    idade integer NOT NULL,
    data_nascimento date NOT NULL,
    nome_responsavel character varying(255) NOT NULL,
    telefone_responsavel character varying(30),
    email_responsavel character varying(255),
    endereco_residencial text NOT NULL,
    escola character varying(255) NOT NULL,
    endereco_escola text NOT NULL,
    responsavel_id integer,
    motorista_id integer,
    rota_id integer,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notificar_embarque boolean DEFAULT true,
    notificar_desembarque boolean DEFAULT true
);


--
-- Name: criancas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.criancas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: criancas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.criancas_id_seq OWNED BY public.criancas.id;


--
-- Name: criancas_rotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criancas_rotas (
    id integer NOT NULL,
    crianca_id integer,
    rota_id integer,
    endereco_embarque text,
    endereco_desembarque text,
    latitude_embarque numeric(10,8),
    longitude_embarque numeric(11,8),
    latitude_desembarque numeric(10,8),
    longitude_desembarque numeric(11,8),
    horario_embarque time without time zone,
    horario_desembarque time without time zone,
    horario_embarque_previsto time without time zone,
    horario_desembarque_previsto time without time zone,
    ordem_embarque integer,
    observacoes text,
    ativo boolean DEFAULT true,
    ativa boolean GENERATED ALWAYS AS (ativo) STORED,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: criancas_rotas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.criancas_rotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: criancas_rotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.criancas_rotas_id_seq OWNED BY public.criancas_rotas.id;


--
-- Name: criancas_viagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.criancas_viagens (
    id integer NOT NULL,
    viagem_id integer,
    crianca_id integer,
    horario_embarque timestamp with time zone,
    horario_desembarque timestamp with time zone,
    status character varying(50) DEFAULT 'aguardando'::character varying,
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: criancas_viagens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.criancas_viagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: criancas_viagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.criancas_viagens_id_seq OWNED BY public.criancas_viagens.id;


--
-- Name: dispositivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispositivos (
    id integer NOT NULL,
    usuario_id integer,
    token_dispositivo character varying(255),
    tipo_dispositivo character varying(50),
    sistema_operacional character varying(50),
    versao_app character varying(50),
    ultimo_acesso timestamp with time zone,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dispositivos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dispositivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dispositivos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dispositivos_id_seq OWNED BY public.dispositivos.id;


--
-- Name: documentos_motorista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_motorista (
    id integer NOT NULL,
    usuario_id integer,
    tipo_documento character varying(100) NOT NULL,
    nome_arquivo character varying(255) NOT NULL,
    caminho_arquivo text NOT NULL,
    tamanho_arquivo integer,
    mime_type character varying(100),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: documentos_motorista_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documentos_motorista_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_motorista_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documentos_motorista_id_seq OWNED BY public.documentos_motorista.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    usuario_id integer,
    razao_social character varying(255) NOT NULL,
    nome_fantasia character varying(255),
    cnpj character varying(20) NOT NULL,
    telefone character varying(20),
    cep character varying(10),
    rua character varying(255),
    numero character varying(20),
    complemento character varying(100),
    bairro character varying(100),
    cidade character varying(100),
    estado character varying(2),
    foto_cnpj character varying(255),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: estatisticas_uso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estatisticas_uso (
    id integer NOT NULL,
    usuario_id integer,
    tipo_estatistica character varying(50) NOT NULL,
    valor integer DEFAULT 1,
    data_registro date DEFAULT CURRENT_DATE,
    detalhes jsonb,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: estatisticas_uso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estatisticas_uso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estatisticas_uso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estatisticas_uso_id_seq OWNED BY public.estatisticas_uso.id;


--
-- Name: eventos_rastreamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_rastreamento (
    id integer NOT NULL,
    viagem_id integer,
    motorista_id integer,
    tipo_evento character varying(50) NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    descricao text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: eventos_rastreamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eventos_rastreamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eventos_rastreamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eventos_rastreamento_id_seq OWNED BY public.eventos_rastreamento.id;


--
-- Name: eventos_viagem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos_viagem (
    id integer NOT NULL,
    viagem_id integer NOT NULL,
    crianca_id integer NOT NULL,
    tipo_evento character varying(20) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    observacoes text
);


--
-- Name: eventos_viagem_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.eventos_viagem_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: eventos_viagem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.eventos_viagem_id_seq OWNED BY public.eventos_viagem.id;


--
-- Name: feedback_usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_usuarios (
    id integer NOT NULL,
    usuario_id integer,
    tipo_feedback character varying(50),
    classificacao integer,
    comentario text,
    respondido boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feedback_usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.feedback_usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: feedback_usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.feedback_usuarios_id_seq OWNED BY public.feedback_usuarios.id;


--
-- Name: historico_transportes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_transportes (
    id integer NOT NULL,
    crianca_id integer,
    motorista_id integer,
    data date NOT NULL,
    status_ida character varying(50),
    status_volta character varying(50),
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: historico_transportes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historico_transportes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historico_transportes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historico_transportes_id_seq OWNED BY public.historico_transportes.id;


--
-- Name: inscricoes_excursao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inscricoes_excursao (
    id integer NOT NULL,
    pacote_id integer,
    usuario_id integer,
    status_inscricao character varying(30) DEFAULT 'pendente'::character varying,
    data_inscricao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    observacoes text
);


--
-- Name: inscricoes_excursao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inscricoes_excursao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inscricoes_excursao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inscricoes_excursao_id_seq OWNED BY public.inscricoes_excursao.id;


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: lembretes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lembretes (
    id integer NOT NULL,
    usuario_id integer,
    titulo character varying(255) NOT NULL,
    descricao text,
    data_lembrete timestamp with time zone NOT NULL,
    recorrente boolean DEFAULT false,
    padrao_recorrencia character varying(50),
    notificar boolean DEFAULT true,
    concluido boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: lembretes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lembretes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lembretes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lembretes_id_seq OWNED BY public.lembretes.id;


--
-- Name: localizacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.localizacoes (
    id integer NOT NULL,
    viagem_id integer,
    motorista_id integer,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    altitude numeric(8,2),
    velocidade numeric(5,2),
    direcao integer,
    precisao numeric(5,2),
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    endereco text,
    tipo_ponto character varying(50) DEFAULT 'tracking'::character varying,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: localizacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.localizacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: localizacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.localizacoes_id_seq OWNED BY public.localizacoes.id;


--
-- Name: logs_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_sistema (
    id integer NOT NULL,
    tipo character varying(50) NOT NULL,
    mensagem text NOT NULL,
    dados jsonb,
    usuario_id integer,
    ip_origem character varying(50),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: logs_sistema_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.logs_sistema_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: logs_sistema_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.logs_sistema_id_seq OWNED BY public.logs_sistema.id;


--
-- Name: manutencoes_veiculo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manutencoes_veiculo (
    id integer NOT NULL,
    veiculo_id integer,
    tipo_manutencao character varying(100) NOT NULL,
    data_manutencao date NOT NULL,
    quilometragem integer,
    custo numeric(10,2),
    observacoes text,
    proxima_manutencao date,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: manutencoes_veiculo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manutencoes_veiculo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manutencoes_veiculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manutencoes_veiculo_id_seq OWNED BY public.manutencoes_veiculo.id;


--
-- Name: mensagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mensagens (
    id integer NOT NULL,
    remetente_id integer,
    destinatario_id integer,
    assunto character varying(255),
    conteudo text NOT NULL,
    lida boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mensagens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mensagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mensagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mensagens_id_seq OWNED BY public.mensagens.id;


--
-- Name: metricas_viagem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metricas_viagem (
    id integer NOT NULL,
    viagem_id integer,
    motorista_id integer,
    tempo_total integer,
    distancia_total numeric(10,2),
    velocidade_media numeric(5,2),
    velocidade_maxima numeric(5,2),
    consumo_combustivel numeric(5,2),
    custo_estimado numeric(8,2),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: metricas_viagem_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metricas_viagem_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metricas_viagem_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metricas_viagem_id_seq OWNED BY public.metricas_viagem.id;


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes (
    id integer NOT NULL,
    usuario_id integer,
    titulo character varying(255) NOT NULL,
    mensagem text NOT NULL,
    tipo character varying(50),
    lida boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notificacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificacoes_id_seq OWNED BY public.notificacoes.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id integer NOT NULL,
    usuario_id integer,
    tipo_notificacao character varying(50) NOT NULL,
    ativo boolean DEFAULT true,
    canais json,
    horarios_permitidos json,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: pacotes_excursao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_excursao (
    id integer NOT NULL,
    usuario_id integer,
    nome_pacote character varying(255) NOT NULL,
    descricao text,
    destino character varying(255),
    data_saida date,
    data_retorno date,
    data_inicio date,
    data_fim date,
    duracao_dias integer,
    horario_saida time without time zone,
    horario_retorno time without time zone,
    valor_por_pessoa numeric(10,2),
    preco_por_pessoa numeric(10,2),
    vagas_disponiveis integer DEFAULT 0,
    inclui_alimentacao boolean DEFAULT false,
    inclui_hospedagem boolean DEFAULT false,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    latitude_partida numeric(10,8),
    longitude_partida numeric(11,8),
    endereco_partida text,
    latitude_destino numeric(10,8),
    longitude_destino numeric(11,8),
    endereco_destino text
);


--
-- Name: pacotes_excursao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pacotes_excursao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pacotes_excursao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pacotes_excursao_id_seq OWNED BY public.pacotes_excursao.id;


--
-- Name: pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagamentos (
    id integer NOT NULL,
    usuario_id integer,
    assinatura_id integer,
    valor numeric(10,2) NOT NULL,
    data_pagamento timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    metodo_pagamento character varying(50),
    status character varying(50) DEFAULT 'processando'::character varying,
    referencia_externa character varying(255),
    detalhes jsonb,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pagamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagamentos_id_seq OWNED BY public.pagamentos.id;


--
-- Name: paradas_rota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paradas_rota (
    id integer NOT NULL,
    rota_id integer NOT NULL,
    ordem_parada integer NOT NULL,
    endereco text NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    horario_previsto time without time zone,
    raio_deteccao integer DEFAULT 50,
    tipo_parada character varying(15),
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT paradas_rota_tipo_parada_check CHECK (((tipo_parada)::text = ANY ((ARRAY['embarque'::character varying, 'desembarque'::character varying, 'escola'::character varying])::text[])))
);


--
-- Name: paradas_rota_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paradas_rota_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paradas_rota_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paradas_rota_id_seq OWNED BY public.paradas_rota.id;


--
-- Name: planos_assinatura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planos_assinatura (
    id integer NOT NULL,
    usuario_id integer,
    tipo_plano character varying(50) NOT NULL,
    limite_rotas integer,
    limite_usuarios integer,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: planos_assinatura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.planos_assinatura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: planos_assinatura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.planos_assinatura_id_seq OWNED BY public.planos_assinatura.id;


--
-- Name: pontos_parada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pontos_parada (
    id integer NOT NULL,
    rota_id integer,
    nome character varying(255),
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    ordem integer,
    horario_estimado time without time zone,
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pontos_parada_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pontos_parada_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pontos_parada_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pontos_parada_id_seq OWNED BY public.pontos_parada.id;


--
-- Name: preferencias_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preferencias_usuario (
    id integer NOT NULL,
    usuario_id integer,
    chave character varying(100) NOT NULL,
    valor text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: preferencias_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.preferencias_usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: preferencias_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.preferencias_usuario_id_seq OWNED BY public.preferencias_usuario.id;


--
-- Name: presencas_conferencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presencas_conferencia (
    id integer NOT NULL,
    conferencia_id integer,
    crianca_id integer,
    status character varying(20) NOT NULL,
    horario_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    observacoes text,
    CONSTRAINT presencas_conferencia_status_check CHECK (((status)::text = ANY ((ARRAY['presente'::character varying, 'ausente'::character varying, 'atrasado'::character varying])::text[])))
);


--
-- Name: presencas_conferencia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.presencas_conferencia_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: presencas_conferencia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.presencas_conferencia_id_seq OWNED BY public.presencas_conferencia.id;


--
-- Name: rastreamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rastreamento (
    id integer NOT NULL,
    motorista_id integer,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    velocidade numeric(5,2),
    precisao numeric(5,2),
    status character varying(50),
    observacoes text
);


--
-- Name: rastreamento_gps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rastreamento_gps (
    id integer NOT NULL,
    viagem_id integer NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    velocidade numeric(5,2),
    direcao integer,
    precisao numeric(8,2),
    altitude numeric(8,2),
    timestamp_gps timestamp with time zone NOT NULL,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rastreamento_gps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rastreamento_gps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rastreamento_gps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rastreamento_gps_id_seq OWNED BY public.rastreamento_gps.id;


--
-- Name: rastreamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rastreamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rastreamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rastreamento_id_seq OWNED BY public.rastreamento.id;


--
-- Name: relatorios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relatorios (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    tipo character varying(50) NOT NULL,
    parametros jsonb,
    resultado jsonb,
    usuario_id integer,
    data_geracao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    url_arquivo character varying(255),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: relatorios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.relatorios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: relatorios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.relatorios_id_seq OWNED BY public.relatorios.id;


--
-- Name: rotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rotas (
    id integer NOT NULL,
    motorista_id integer,
    nome_rota character varying(255) NOT NULL,
    origem character varying(255),
    destino character varying(255),
    horario_ida time without time zone,
    horario_volta time without time zone,
    ativa boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ativa_backup boolean,
    ativo boolean DEFAULT true,
    usuario_id integer,
    descricao text,
    horario_inicio time without time zone,
    horario_fim time without time zone,
    dias_semana character varying(20),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rotas_escolares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rotas_escolares (
    id integer NOT NULL,
    usuario_id integer,
    nome_rota character varying(255) NOT NULL,
    escola_destino character varying(255),
    turno character varying(20),
    descricao text,
    horario_ida time without time zone,
    horario_volta time without time zone,
    dias_semana character varying(20) DEFAULT 'seg-sex'::character varying,
    valor_mensal numeric(10,2),
    preco_mensal numeric(10,2),
    vagas_disponiveis integer DEFAULT 0,
    ativa boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    latitude_origem numeric(10,8),
    longitude_origem numeric(11,8),
    latitude_destino numeric(10,8),
    longitude_destino numeric(11,8),
    endereco_origem text,
    endereco_destino text,
    capacidade_maxima integer,
    capacidade_atual integer DEFAULT 0,
    status_rota character varying(20) DEFAULT 'ativa'::character varying,
    CONSTRAINT rotas_escolares_status_rota_check CHECK (((status_rota)::text = ANY ((ARRAY['ativa'::character varying, 'inativa'::character varying, 'suspensa'::character varying])::text[])))
);


--
-- Name: rotas_escolares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rotas_escolares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rotas_escolares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rotas_escolares_id_seq OWNED BY public.rotas_escolares.id;


--
-- Name: rotas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rotas_id_seq OWNED BY public.rotas.id;


--
-- Name: sessoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessoes (
    id integer NOT NULL,
    usuario_id integer,
    token character varying(255) NOT NULL,
    ip_origem character varying(50),
    user_agent text,
    data_expiracao timestamp with time zone NOT NULL,
    ativa boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sessoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessoes_id_seq OWNED BY public.sessoes.id;


--
-- Name: suporte_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suporte_tickets (
    id integer NOT NULL,
    usuario_id integer,
    assunto character varying(255) NOT NULL,
    descricao text NOT NULL,
    status character varying(50) DEFAULT 'aberto'::character varying,
    prioridade character varying(50) DEFAULT 'normal'::character varying,
    atribuido_para integer,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: suporte_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suporte_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suporte_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suporte_tickets_id_seq OWNED BY public.suporte_tickets.id;


--
-- Name: tokens_recuperacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens_recuperacao (
    id integer NOT NULL,
    usuario_id integer,
    token character varying(255) NOT NULL,
    valido_ate timestamp with time zone NOT NULL,
    utilizado boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tokens_recuperacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tokens_recuperacao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tokens_recuperacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tokens_recuperacao_id_seq OWNED BY public.tokens_recuperacao.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nome_completo character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    senha character varying(255) NOT NULL,
    celular character varying(20),
    data_nascimento date,
    tipo_cadastro character varying(50),
    tipo_usuario character varying(50),
    endereco_completo text,
    tipo_pessoa character varying(20),
    foto_perfil character varying(255),
    nome_emergencia character varying(100),
    telefone_emergencia character varying(20),
    cnh character varying(20),
    categoria_cnh character varying(5),
    validade_cnh date,
    foto_cnh character varying(255),
    foto_antecedentes character varying(255),
    foto_curso character varying(255),
    rua character varying(255),
    numero character varying(20),
    complemento character varying(100),
    cep character varying(10),
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    latitude numeric(10,8),
    longitude numeric(11,8),
    bairro character varying(100),
    cidade character varying(100),
    estado character varying(2) DEFAULT 'SP'::character varying
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: usuarios_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios_status (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    tipo_usuario character varying(50) NOT NULL,
    ativo boolean DEFAULT true,
    origem character varying(50) DEFAULT 'manual'::character varying,
    motivo text,
    atualizado_por integer,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: usuarios_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_status_id_seq OWNED BY public.usuarios_status.id;


--
-- Name: veiculos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.veiculos (
    id integer NOT NULL,
    placa character varying(20) NOT NULL,
    modelo character varying(100) NOT NULL,
    capacidade integer NOT NULL,
    ano integer,
    ano_modelo integer,
    seguradora character varying(100),
    apolice character varying(50),
    validade_seguro date,
    foto_crlv character varying(255),
    status character varying(50) DEFAULT 'ativo'::character varying,
    motorista_id integer,
    ultima_manutencao date,
    quilometragem integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: veiculos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.veiculos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: veiculos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.veiculos_id_seq OWNED BY public.veiculos.id;


--
-- Name: viagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viagens (
    id integer NOT NULL,
    motorista_id integer,
    rota_id integer,
    data_viagem date DEFAULT CURRENT_DATE NOT NULL,
    horario_inicio timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    horario_fim timestamp with time zone,
    tipo_viagem character varying(50) DEFAULT 'ida'::character varying,
    status character varying(50) DEFAULT 'iniciada'::character varying,
    distancia_total numeric(8,2),
    tempo_total integer,
    observacoes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: viagens_ativas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viagens_ativas (
    id integer NOT NULL,
    rota_id integer NOT NULL,
    motorista_id integer,
    tipo_viagem character varying(10) DEFAULT 'ida'::character varying NOT NULL,
    data_viagem date DEFAULT CURRENT_DATE NOT NULL,
    horario_inicio timestamp with time zone,
    horario_fim timestamp with time zone,
    status character varying(20) DEFAULT 'em_andamento'::character varying,
    quilometragem_inicial numeric(10,2),
    quilometragem_final numeric(10,2),
    quilometragem_total numeric(10,2),
    combustivel_gasto numeric(8,2),
    tempo_total_minutos integer,
    total_criancas_esperadas integer DEFAULT 0,
    total_criancas_embarcadas integer DEFAULT 0,
    total_criancas_desembarcadas integer DEFAULT 0,
    observacoes text,
    criado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_id integer,
    veiculo_id integer,
    odometro_inicial numeric(12,2),
    odometro_final numeric(12,2),
    distancia_percorrida_km numeric(12,3),
    data_fim timestamp with time zone,
    CONSTRAINT viagens_ativas_status_check CHECK (((status)::text = ANY ((ARRAY['agendada'::character varying, 'iniciada'::character varying, 'em_andamento'::character varying, 'pausada'::character varying, 'concluida'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT viagens_ativas_tipo_viagem_check CHECK (((tipo_viagem)::text = ANY ((ARRAY['ida'::character varying, 'volta'::character varying])::text[])))
);


--
-- Name: viagens_ativas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viagens_ativas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: viagens_ativas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viagens_ativas_id_seq OWNED BY public.viagens_ativas.id;


--
-- Name: viagens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.viagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: viagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.viagens_id_seq OWNED BY public.viagens.id;


--
-- Name: vw_estatisticas_motoristas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_estatisticas_motoristas AS
 SELECT u.id AS usuario_id,
    u.nome_completo AS nome,
    u.email,
    p.tipo_plano,
    p.limite_rotas,
    count(r.id) AS total_rotas,
    count(
        CASE
            WHEN (r.ativa = true) THEN 1
            ELSE NULL::integer
        END) AS rotas_ativas,
    COALESCE(sum(r.capacidade_atual), (0)::bigint) AS total_criancas,
    avg(r.valor_mensal) AS valor_medio_mensal
   FROM ((public.usuarios u
     LEFT JOIN public.planos_assinatura p ON (((p.usuario_id = u.id) AND (p.ativo = true))))
     LEFT JOIN public.rotas_escolares r ON ((r.usuario_id = u.id)))
  WHERE ((u.tipo_cadastro)::text = 'motorista_escolar'::text)
  GROUP BY u.id, u.nome_completo, u.email, p.tipo_plano, p.limite_rotas;


--
-- Name: vw_ocupacao_rotas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_ocupacao_rotas AS
 SELECT id AS rota_id,
    usuario_id,
    nome_rota,
    capacidade_atual,
    capacidade_maxima,
    (capacidade_maxima - capacidade_atual) AS vagas_disponiveis,
    status_rota,
    ativa
   FROM public.rotas_escolares r;


--
-- Name: alertas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas ALTER COLUMN id SET DEFAULT nextval('public.alertas_id_seq'::regclass);


--
-- Name: arquivos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arquivos ALTER COLUMN id SET DEFAULT nextval('public.arquivos_id_seq'::regclass);


--
-- Name: assinaturas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assinaturas ALTER COLUMN id SET DEFAULT nextval('public.assinaturas_id_seq'::regclass);


--
-- Name: avaliacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes ALTER COLUMN id SET DEFAULT nextval('public.avaliacoes_id_seq'::regclass);


--
-- Name: cache_localizacao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_localizacao ALTER COLUMN id SET DEFAULT nextval('public.cache_localizacao_id_seq'::regclass);


--
-- Name: caracteristicas_veiculos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caracteristicas_veiculos ALTER COLUMN id SET DEFAULT nextval('public.caracteristicas_veiculos_id_seq'::regclass);


--
-- Name: checkins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins ALTER COLUMN id SET DEFAULT nextval('public.checkins_id_seq'::regclass);


--
-- Name: conferencia_criancas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencia_criancas ALTER COLUMN id SET DEFAULT nextval('public.conferencia_criancas_id_seq'::regclass);


--
-- Name: conferencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias ALTER COLUMN id SET DEFAULT nextval('public.conferencias_id_seq'::regclass);


--
-- Name: configuracoes_sistema id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_sistema ALTER COLUMN id SET DEFAULT nextval('public.configuracoes_sistema_id_seq'::regclass);


--
-- Name: contatos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contatos ALTER COLUMN id SET DEFAULT nextval('public.contatos_id_seq'::regclass);


--
-- Name: cotacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes ALTER COLUMN id SET DEFAULT nextval('public.cotacoes_id_seq'::regclass);


--
-- Name: criancas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas ALTER COLUMN id SET DEFAULT nextval('public.criancas_id_seq'::regclass);


--
-- Name: criancas_rotas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_rotas ALTER COLUMN id SET DEFAULT nextval('public.criancas_rotas_id_seq'::regclass);


--
-- Name: criancas_viagens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_viagens ALTER COLUMN id SET DEFAULT nextval('public.criancas_viagens_id_seq'::regclass);


--
-- Name: dispositivos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivos ALTER COLUMN id SET DEFAULT nextval('public.dispositivos_id_seq'::regclass);


--
-- Name: documentos_motorista id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_motorista ALTER COLUMN id SET DEFAULT nextval('public.documentos_motorista_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: estatisticas_uso id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatisticas_uso ALTER COLUMN id SET DEFAULT nextval('public.estatisticas_uso_id_seq'::regclass);


--
-- Name: eventos_rastreamento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_rastreamento ALTER COLUMN id SET DEFAULT nextval('public.eventos_rastreamento_id_seq'::regclass);


--
-- Name: eventos_viagem id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_viagem ALTER COLUMN id SET DEFAULT nextval('public.eventos_viagem_id_seq'::regclass);


--
-- Name: feedback_usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_usuarios ALTER COLUMN id SET DEFAULT nextval('public.feedback_usuarios_id_seq'::regclass);


--
-- Name: historico_transportes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_transportes ALTER COLUMN id SET DEFAULT nextval('public.historico_transportes_id_seq'::regclass);


--
-- Name: inscricoes_excursao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricoes_excursao ALTER COLUMN id SET DEFAULT nextval('public.inscricoes_excursao_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: lembretes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes ALTER COLUMN id SET DEFAULT nextval('public.lembretes_id_seq'::regclass);


--
-- Name: localizacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localizacoes ALTER COLUMN id SET DEFAULT nextval('public.localizacoes_id_seq'::regclass);


--
-- Name: logs_sistema id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_sistema ALTER COLUMN id SET DEFAULT nextval('public.logs_sistema_id_seq'::regclass);


--
-- Name: manutencoes_veiculo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes_veiculo ALTER COLUMN id SET DEFAULT nextval('public.manutencoes_veiculo_id_seq'::regclass);


--
-- Name: mensagens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensagens ALTER COLUMN id SET DEFAULT nextval('public.mensagens_id_seq'::regclass);


--
-- Name: metricas_viagem id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_viagem ALTER COLUMN id SET DEFAULT nextval('public.metricas_viagem_id_seq'::regclass);


--
-- Name: notificacoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes ALTER COLUMN id SET DEFAULT nextval('public.notificacoes_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: pacotes_excursao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_excursao ALTER COLUMN id SET DEFAULT nextval('public.pacotes_excursao_id_seq'::regclass);


--
-- Name: pagamentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos ALTER COLUMN id SET DEFAULT nextval('public.pagamentos_id_seq'::regclass);


--
-- Name: paradas_rota id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paradas_rota ALTER COLUMN id SET DEFAULT nextval('public.paradas_rota_id_seq'::regclass);


--
-- Name: planos_assinatura id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos_assinatura ALTER COLUMN id SET DEFAULT nextval('public.planos_assinatura_id_seq'::regclass);


--
-- Name: pontos_parada id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontos_parada ALTER COLUMN id SET DEFAULT nextval('public.pontos_parada_id_seq'::regclass);


--
-- Name: preferencias_usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferencias_usuario ALTER COLUMN id SET DEFAULT nextval('public.preferencias_usuario_id_seq'::regclass);


--
-- Name: presencas_conferencia id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas_conferencia ALTER COLUMN id SET DEFAULT nextval('public.presencas_conferencia_id_seq'::regclass);


--
-- Name: rastreamento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rastreamento ALTER COLUMN id SET DEFAULT nextval('public.rastreamento_id_seq'::regclass);


--
-- Name: rastreamento_gps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rastreamento_gps ALTER COLUMN id SET DEFAULT nextval('public.rastreamento_gps_id_seq'::regclass);


--
-- Name: relatorios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relatorios ALTER COLUMN id SET DEFAULT nextval('public.relatorios_id_seq'::regclass);


--
-- Name: rotas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rotas ALTER COLUMN id SET DEFAULT nextval('public.rotas_id_seq'::regclass);


--
-- Name: rotas_escolares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rotas_escolares ALTER COLUMN id SET DEFAULT nextval('public.rotas_escolares_id_seq'::regclass);


--
-- Name: sessoes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessoes ALTER COLUMN id SET DEFAULT nextval('public.sessoes_id_seq'::regclass);


--
-- Name: suporte_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suporte_tickets ALTER COLUMN id SET DEFAULT nextval('public.suporte_tickets_id_seq'::regclass);


--
-- Name: tokens_recuperacao id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens_recuperacao ALTER COLUMN id SET DEFAULT nextval('public.tokens_recuperacao_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: usuarios_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_status ALTER COLUMN id SET DEFAULT nextval('public.usuarios_status_id_seq'::regclass);


--
-- Name: veiculos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.veiculos ALTER COLUMN id SET DEFAULT nextval('public.veiculos_id_seq'::regclass);


--
-- Name: viagens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens ALTER COLUMN id SET DEFAULT nextval('public.viagens_id_seq'::regclass);


--
-- Name: viagens_ativas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens_ativas ALTER COLUMN id SET DEFAULT nextval('public.viagens_ativas_id_seq'::regclass);


--
-- Name: alertas alertas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT alertas_pkey PRIMARY KEY (id);


--
-- Name: arquivos arquivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arquivos
    ADD CONSTRAINT arquivos_pkey PRIMARY KEY (id);


--
-- Name: assinaturas assinaturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_pkey PRIMARY KEY (id);


--
-- Name: avaliacoes avaliacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avaliacoes
    ADD CONSTRAINT avaliacoes_pkey PRIMARY KEY (id);


--
-- Name: cache_localizacao cache_localizacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_localizacao
    ADD CONSTRAINT cache_localizacao_pkey PRIMARY KEY (id);


--
-- Name: caracteristicas_veiculos caracteristicas_veiculos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caracteristicas_veiculos
    ADD CONSTRAINT caracteristicas_veiculos_pkey PRIMARY KEY (id);


--
-- Name: checkins checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_pkey PRIMARY KEY (id);


--
-- Name: conferencia_criancas conferencia_criancas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencia_criancas
    ADD CONSTRAINT conferencia_criancas_pkey PRIMARY KEY (id);


--
-- Name: conferencias conferencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias
    ADD CONSTRAINT conferencias_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_sistema configuracoes_sistema_chave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_sistema
    ADD CONSTRAINT configuracoes_sistema_chave_key UNIQUE (chave);


--
-- Name: configuracoes_sistema configuracoes_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_sistema
    ADD CONSTRAINT configuracoes_sistema_pkey PRIMARY KEY (id);


--
-- Name: contatos contatos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contatos
    ADD CONSTRAINT contatos_pkey PRIMARY KEY (id);


--
-- Name: cotacoes cotacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes
    ADD CONSTRAINT cotacoes_pkey PRIMARY KEY (id);


--
-- Name: criancas criancas_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas
    ADD CONSTRAINT criancas_cpf_key UNIQUE (cpf);


--
-- Name: criancas criancas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas
    ADD CONSTRAINT criancas_pkey PRIMARY KEY (id);


--
-- Name: criancas_rotas criancas_rotas_crianca_id_rota_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_rotas
    ADD CONSTRAINT criancas_rotas_crianca_id_rota_id_key UNIQUE (crianca_id, rota_id);


--
-- Name: criancas_rotas criancas_rotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_rotas
    ADD CONSTRAINT criancas_rotas_pkey PRIMARY KEY (id);


--
-- Name: criancas_viagens criancas_viagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_viagens
    ADD CONSTRAINT criancas_viagens_pkey PRIMARY KEY (id);


--
-- Name: dispositivos dispositivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivos
    ADD CONSTRAINT dispositivos_pkey PRIMARY KEY (id);


--
-- Name: documentos_motorista documentos_motorista_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_motorista
    ADD CONSTRAINT documentos_motorista_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_cnpj_key UNIQUE (cnpj);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: estatisticas_uso estatisticas_uso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estatisticas_uso
    ADD CONSTRAINT estatisticas_uso_pkey PRIMARY KEY (id);


--
-- Name: eventos_rastreamento eventos_rastreamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_rastreamento
    ADD CONSTRAINT eventos_rastreamento_pkey PRIMARY KEY (id);


--
-- Name: eventos_viagem eventos_viagem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_viagem
    ADD CONSTRAINT eventos_viagem_pkey PRIMARY KEY (id);


--
-- Name: feedback_usuarios feedback_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_usuarios
    ADD CONSTRAINT feedback_usuarios_pkey PRIMARY KEY (id);


--
-- Name: historico_transportes historico_transportes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_transportes
    ADD CONSTRAINT historico_transportes_pkey PRIMARY KEY (id);


--
-- Name: inscricoes_excursao inscricoes_excursao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricoes_excursao
    ADD CONSTRAINT inscricoes_excursao_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: lembretes lembretes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT lembretes_pkey PRIMARY KEY (id);


--
-- Name: localizacoes localizacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localizacoes
    ADD CONSTRAINT localizacoes_pkey PRIMARY KEY (id);


--
-- Name: logs_sistema logs_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_sistema
    ADD CONSTRAINT logs_sistema_pkey PRIMARY KEY (id);


--
-- Name: manutencoes_veiculo manutencoes_veiculo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes_veiculo
    ADD CONSTRAINT manutencoes_veiculo_pkey PRIMARY KEY (id);


--
-- Name: mensagens mensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensagens
    ADD CONSTRAINT mensagens_pkey PRIMARY KEY (id);


--
-- Name: metricas_viagem metricas_viagem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_viagem
    ADD CONSTRAINT metricas_viagem_pkey PRIMARY KEY (id);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: pacotes_excursao pacotes_excursao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_excursao
    ADD CONSTRAINT pacotes_excursao_pkey PRIMARY KEY (id);


--
-- Name: pagamentos pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);


--
-- Name: paradas_rota paradas_rota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paradas_rota
    ADD CONSTRAINT paradas_rota_pkey PRIMARY KEY (id);


--
-- Name: paradas_rota paradas_rota_rota_id_ordem_parada_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paradas_rota
    ADD CONSTRAINT paradas_rota_rota_id_ordem_parada_key UNIQUE (rota_id, ordem_parada);


--
-- Name: planos_assinatura planos_assinatura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos_assinatura
    ADD CONSTRAINT planos_assinatura_pkey PRIMARY KEY (id);


--
-- Name: pontos_parada pontos_parada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontos_parada
    ADD CONSTRAINT pontos_parada_pkey PRIMARY KEY (id);


--
-- Name: preferencias_usuario preferencias_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferencias_usuario
    ADD CONSTRAINT preferencias_usuario_pkey PRIMARY KEY (id);


--
-- Name: preferencias_usuario preferencias_usuario_usuario_id_chave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferencias_usuario
    ADD CONSTRAINT preferencias_usuario_usuario_id_chave_key UNIQUE (usuario_id, chave);


--
-- Name: presencas_conferencia presencas_conferencia_conferencia_id_crianca_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas_conferencia
    ADD CONSTRAINT presencas_conferencia_conferencia_id_crianca_id_key UNIQUE (conferencia_id, crianca_id);


--
-- Name: presencas_conferencia presencas_conferencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas_conferencia
    ADD CONSTRAINT presencas_conferencia_pkey PRIMARY KEY (id);


--
-- Name: rastreamento_gps rastreamento_gps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rastreamento_gps
    ADD CONSTRAINT rastreamento_gps_pkey PRIMARY KEY (id);


--
-- Name: rastreamento rastreamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rastreamento
    ADD CONSTRAINT rastreamento_pkey PRIMARY KEY (id);


--
-- Name: relatorios relatorios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relatorios
    ADD CONSTRAINT relatorios_pkey PRIMARY KEY (id);


--
-- Name: rotas_escolares rotas_escolares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rotas_escolares
    ADD CONSTRAINT rotas_escolares_pkey PRIMARY KEY (id);


--
-- Name: rotas rotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rotas
    ADD CONSTRAINT rotas_pkey PRIMARY KEY (id);


--
-- Name: sessoes sessoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessoes
    ADD CONSTRAINT sessoes_pkey PRIMARY KEY (id);


--
-- Name: suporte_tickets suporte_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suporte_tickets
    ADD CONSTRAINT suporte_tickets_pkey PRIMARY KEY (id);


--
-- Name: tokens_recuperacao tokens_recuperacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens_recuperacao
    ADD CONSTRAINT tokens_recuperacao_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios_status usuarios_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_status
    ADD CONSTRAINT usuarios_status_pkey PRIMARY KEY (id);


--
-- Name: usuarios_status usuarios_status_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_status
    ADD CONSTRAINT usuarios_status_usuario_id_key UNIQUE (usuario_id);


--
-- Name: veiculos veiculos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.veiculos
    ADD CONSTRAINT veiculos_pkey PRIMARY KEY (id);


--
-- Name: viagens_ativas viagens_ativas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens_ativas
    ADD CONSTRAINT viagens_ativas_pkey PRIMARY KEY (id);


--
-- Name: viagens viagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens
    ADD CONSTRAINT viagens_pkey PRIMARY KEY (id);


--
-- Name: eventos_viagem_crianca_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eventos_viagem_crianca_id_index ON public.eventos_viagem USING btree (crianca_id);


--
-- Name: eventos_viagem_tipo_evento_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eventos_viagem_tipo_evento_index ON public.eventos_viagem USING btree (tipo_evento);


--
-- Name: eventos_viagem_viagem_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eventos_viagem_viagem_id_index ON public.eventos_viagem USING btree (viagem_id);


--
-- Name: idx_alertas_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_tipo ON public.alertas USING btree (tipo);


--
-- Name: idx_alertas_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alertas_usuario ON public.alertas USING btree (usuario_id);


--
-- Name: idx_arquivos_entidade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arquivos_entidade ON public.arquivos USING btree (entidade_tipo, entidade_id);


--
-- Name: idx_arquivos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_arquivos_usuario ON public.arquivos USING btree (usuario_id);


--
-- Name: idx_assinaturas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assinaturas_status ON public.assinaturas USING btree (status);


--
-- Name: idx_assinaturas_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assinaturas_usuario ON public.assinaturas USING btree (usuario_id);


--
-- Name: idx_avaliacoes_aprovado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avaliacoes_aprovado ON public.avaliacoes USING btree (aprovado);


--
-- Name: idx_avaliacoes_avaliado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avaliacoes_avaliado ON public.avaliacoes USING btree (avaliado_id);


--
-- Name: idx_cache_localizacao_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_localizacao_motorista ON public.cache_localizacao USING btree (motorista_id);


--
-- Name: idx_checkins_crianca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_crianca ON public.checkins USING btree (crianca_id);


--
-- Name: idx_checkins_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_timestamp ON public.checkins USING btree ("timestamp");


--
-- Name: idx_conferencia_crianca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conferencia_crianca ON public.conferencia_criancas USING btree (crianca_id);


--
-- Name: idx_conferencia_criancas_crianca_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conferencia_criancas_crianca_id ON public.conferencia_criancas USING btree (crianca_id);


--
-- Name: idx_conferencia_criancas_viagem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conferencia_criancas_viagem_id ON public.conferencia_criancas USING btree (viagem_id);


--
-- Name: idx_conferencia_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conferencia_viagem ON public.conferencia_criancas USING btree (viagem_id);


--
-- Name: idx_configuracoes_chave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_configuracoes_chave ON public.configuracoes_sistema USING btree (chave);


--
-- Name: idx_contatos_criado_em; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contatos_criado_em ON public.contatos USING btree (criado_em);


--
-- Name: idx_contatos_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contatos_email ON public.contatos USING btree (email);


--
-- Name: idx_criancas_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_ativo ON public.criancas USING btree (ativo);


--
-- Name: idx_criancas_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_motorista ON public.criancas USING btree (motorista_id);


--
-- Name: idx_criancas_responsavel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_responsavel ON public.criancas USING btree (responsavel_id);


--
-- Name: idx_criancas_rotas_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_rotas_ativo ON public.criancas_rotas USING btree (ativo);


--
-- Name: idx_criancas_rotas_crianca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_rotas_crianca ON public.criancas_rotas USING btree (crianca_id);


--
-- Name: idx_criancas_rotas_rota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_rotas_rota ON public.criancas_rotas USING btree (rota_id);


--
-- Name: idx_criancas_viagens_crianca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_viagens_crianca ON public.criancas_viagens USING btree (crianca_id);


--
-- Name: idx_criancas_viagens_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_criancas_viagens_viagem ON public.criancas_viagens USING btree (viagem_id);


--
-- Name: idx_dispositivos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispositivos_usuario ON public.dispositivos USING btree (usuario_id);


--
-- Name: idx_estatisticas_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estatisticas_tipo ON public.estatisticas_uso USING btree (tipo_estatistica);


--
-- Name: idx_estatisticas_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estatisticas_usuario ON public.estatisticas_uso USING btree (usuario_id);


--
-- Name: idx_eventos_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_motorista ON public.eventos_rastreamento USING btree (motorista_id);


--
-- Name: idx_eventos_rastreamento_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_rastreamento_tipo ON public.eventos_rastreamento USING btree (tipo_evento);


--
-- Name: idx_eventos_rastreamento_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_rastreamento_viagem ON public.eventos_rastreamento USING btree (viagem_id);


--
-- Name: idx_eventos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_tipo ON public.eventos_rastreamento USING btree (tipo_evento);


--
-- Name: idx_eventos_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_viagem ON public.eventos_rastreamento USING btree (viagem_id);


--
-- Name: idx_feedback_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_usuario ON public.feedback_usuarios USING btree (usuario_id);


--
-- Name: idx_gps_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gps_timestamp ON public.rastreamento_gps USING btree (timestamp_gps);


--
-- Name: idx_gps_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gps_viagem ON public.rastreamento_gps USING btree (viagem_id);


--
-- Name: idx_inscricoes_pacote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inscricoes_pacote ON public.inscricoes_excursao USING btree (pacote_id);


--
-- Name: idx_lembretes_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lembretes_data ON public.lembretes USING btree (data_lembrete);


--
-- Name: idx_lembretes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lembretes_usuario ON public.lembretes USING btree (usuario_id);


--
-- Name: idx_localizacoes_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_localizacoes_motorista ON public.localizacoes USING btree (motorista_id);


--
-- Name: idx_localizacoes_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_localizacoes_timestamp ON public.localizacoes USING btree ("timestamp");


--
-- Name: idx_localizacoes_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_localizacoes_viagem ON public.localizacoes USING btree (viagem_id);


--
-- Name: idx_logs_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_tipo ON public.logs_sistema USING btree (tipo);


--
-- Name: idx_logs_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_usuario ON public.logs_sistema USING btree (usuario_id);


--
-- Name: idx_manutencoes_veiculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manutencoes_veiculo ON public.manutencoes_veiculo USING btree (veiculo_id);


--
-- Name: idx_mensagens_destinatario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mensagens_destinatario ON public.mensagens USING btree (destinatario_id);


--
-- Name: idx_mensagens_remetente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mensagens_remetente ON public.mensagens USING btree (remetente_id);


--
-- Name: idx_notificacoes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificacoes_usuario ON public.notificacoes USING btree (usuario_id, lida);


--
-- Name: idx_notification_preferences_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_updated_at ON public.notification_preferences USING btree (updated_at);


--
-- Name: idx_notification_preferences_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_usuario ON public.notification_preferences USING btree (usuario_id);


--
-- Name: idx_pacotes_coordenadas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacotes_coordenadas ON public.pacotes_excursao USING btree (latitude_partida, longitude_partida) WHERE ((latitude_partida IS NOT NULL) AND (longitude_partida IS NOT NULL));


--
-- Name: idx_pacotes_excursao_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacotes_excursao_ativo ON public.pacotes_excursao USING btree (ativo);


--
-- Name: idx_pacotes_excursao_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pacotes_excursao_usuario ON public.pacotes_excursao USING btree (usuario_id);


--
-- Name: idx_pagamentos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_status ON public.pagamentos USING btree (status);


--
-- Name: idx_pagamentos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_usuario ON public.pagamentos USING btree (usuario_id);


--
-- Name: idx_paradas_rota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paradas_rota ON public.paradas_rota USING btree (rota_id);


--
-- Name: idx_paradas_rota_rota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_paradas_rota_rota ON public.paradas_rota USING btree (rota_id);


--
-- Name: idx_planos_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planos_ativo ON public.planos_assinatura USING btree (ativo);


--
-- Name: idx_planos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planos_tipo ON public.planos_assinatura USING btree (tipo_plano);


--
-- Name: idx_planos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_planos_usuario ON public.planos_assinatura USING btree (usuario_id);


--
-- Name: idx_pontos_parada_rota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pontos_parada_rota ON public.pontos_parada USING btree (rota_id);


--
-- Name: idx_preferencias_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_preferencias_usuario ON public.preferencias_usuario USING btree (usuario_id);


--
-- Name: idx_rastreamento_gps_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rastreamento_gps_timestamp ON public.rastreamento_gps USING btree (timestamp_gps);


--
-- Name: idx_rastreamento_gps_viagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rastreamento_gps_viagem ON public.rastreamento_gps USING btree (viagem_id);


--
-- Name: idx_rastreamento_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rastreamento_motorista ON public.rastreamento USING btree (motorista_id);


--
-- Name: idx_relatorios_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relatorios_tipo ON public.relatorios USING btree (tipo);


--
-- Name: idx_relatorios_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_relatorios_usuario ON public.relatorios USING btree (usuario_id);


--
-- Name: idx_rotas_ativa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_ativa ON public.rotas USING btree (ativa);


--
-- Name: idx_rotas_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_ativo ON public.rotas USING btree (ativo);


--
-- Name: idx_rotas_coordenadas_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_coordenadas_origem ON public.rotas_escolares USING btree (latitude_origem, longitude_origem) WHERE ((latitude_origem IS NOT NULL) AND (longitude_origem IS NOT NULL));


--
-- Name: idx_rotas_escolares_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_escolares_status ON public.rotas_escolares USING btree (status_rota, ativa);


--
-- Name: idx_rotas_escolares_turno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_escolares_turno ON public.rotas_escolares USING btree (turno);


--
-- Name: idx_rotas_escolares_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_escolares_usuario ON public.rotas_escolares USING btree (usuario_id);


--
-- Name: idx_rotas_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_motorista ON public.rotas USING btree (motorista_id);


--
-- Name: idx_rotas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rotas_status ON public.rotas_escolares USING btree (status_rota, ativa);


--
-- Name: idx_sessoes_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessoes_token ON public.sessoes USING btree (token);


--
-- Name: idx_sessoes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessoes_usuario ON public.sessoes USING btree (usuario_id);


--
-- Name: idx_suporte_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suporte_status ON public.suporte_tickets USING btree (status);


--
-- Name: idx_suporte_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suporte_usuario ON public.suporte_tickets USING btree (usuario_id);


--
-- Name: idx_tokens_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tokens_usuario ON public.tokens_recuperacao USING btree (usuario_id);


--
-- Name: idx_usuarios_coordenadas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_coordenadas ON public.usuarios USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_status_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_status_tipo ON public.usuarios_status USING btree (tipo_usuario);


--
-- Name: idx_usuarios_status_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_status_usuario ON public.usuarios_status USING btree (usuario_id, ativo);


--
-- Name: idx_usuarios_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_tipo ON public.usuarios USING btree (tipo_usuario);


--
-- Name: idx_veiculos_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_veiculos_motorista ON public.veiculos USING btree (motorista_id);


--
-- Name: idx_veiculos_placa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_veiculos_placa ON public.veiculos USING btree (placa);


--
-- Name: idx_veiculos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_veiculos_status ON public.veiculos USING btree (status);


--
-- Name: idx_viagens_ativas_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_ativas_motorista ON public.viagens_ativas USING btree (motorista_id);


--
-- Name: idx_viagens_ativas_rota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_ativas_rota ON public.viagens_ativas USING btree (rota_id);


--
-- Name: idx_viagens_ativas_rota_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_ativas_rota_id ON public.viagens_ativas USING btree (rota_id);


--
-- Name: idx_viagens_ativas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_ativas_status ON public.viagens_ativas USING btree (status);


--
-- Name: idx_viagens_ativas_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_ativas_usuario ON public.viagens_ativas USING btree (usuario_id);


--
-- Name: idx_viagens_motorista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_motorista ON public.viagens_ativas USING btree (motorista_id);


--
-- Name: idx_viagens_motorista_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_motorista_data ON public.viagens USING btree (motorista_id, data_viagem);


--
-- Name: idx_viagens_rota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_rota ON public.viagens_ativas USING btree (rota_id);


--
-- Name: idx_viagens_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viagens_status ON public.viagens USING btree (status);


--
-- Name: conferencia_criancas trg_conferencia_criancas_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_conferencia_criancas_updated BEFORE UPDATE ON public.conferencia_criancas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: criancas_rotas trg_criancas_rotas_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_criancas_rotas_updated BEFORE UPDATE ON public.criancas_rotas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: criancas trg_criancas_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_criancas_updated BEFORE UPDATE ON public.criancas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pacotes_excursao trg_pacotes_excursao_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pacotes_excursao_updated BEFORE UPDATE ON public.pacotes_excursao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: planos_assinatura trg_planos_assinatura_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_planos_assinatura_updated BEFORE UPDATE ON public.planos_assinatura FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pontos_parada trg_pontos_parada_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pontos_parada_updated BEFORE UPDATE ON public.pontos_parada FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: rotas_escolares trg_rotas_escolares_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rotas_escolares_updated BEFORE UPDATE ON public.rotas_escolares FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: viagens_ativas trg_set_motorista_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_motorista_id BEFORE INSERT ON public.viagens_ativas FOR EACH ROW EXECUTE FUNCTION public.set_motorista_id_from_usuario();


--
-- Name: conferencia_criancas trg_sync_tipo_conferencia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_tipo_conferencia BEFORE INSERT OR UPDATE ON public.conferencia_criancas FOR EACH ROW EXECUTE FUNCTION public.sync_tipo_conferencia_to_evento();


--
-- Name: veiculos trg_sync_veiculo_usuario; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_veiculo_usuario BEFORE INSERT OR UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.sync_veiculo_usuario();


--
-- Name: viagens_ativas trg_sync_viagens_ativas_usuario; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_viagens_ativas_usuario BEFORE INSERT OR UPDATE ON public.viagens_ativas FOR EACH ROW EXECUTE FUNCTION public.sync_viagens_ativas_usuario();


--
-- Name: usuarios_status trg_usuarios_status_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_usuarios_status_updated BEFORE UPDATE ON public.usuarios_status FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: usuarios trg_usuarios_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: viagens_ativas trg_viagens_ativas_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_viagens_ativas_updated BEFORE UPDATE ON public.viagens_ativas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_preferences trigger_update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();


--
-- Name: caracteristicas_veiculos caracteristicas_veiculos_veiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caracteristicas_veiculos
    ADD CONSTRAINT caracteristicas_veiculos_veiculo_id_fkey FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE CASCADE;


--
-- Name: conferencia_criancas conferencia_criancas_crianca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencia_criancas
    ADD CONSTRAINT conferencia_criancas_crianca_id_fkey FOREIGN KEY (crianca_id) REFERENCES public.criancas(id) ON DELETE CASCADE;


--
-- Name: conferencia_criancas conferencia_criancas_viagem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencia_criancas
    ADD CONSTRAINT conferencia_criancas_viagem_id_fkey FOREIGN KEY (viagem_id) REFERENCES public.viagens_ativas(id) ON DELETE CASCADE;


--
-- Name: conferencias conferencias_motorista_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias
    ADD CONSTRAINT conferencias_motorista_id_fkey FOREIGN KEY (motorista_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: conferencias conferencias_rota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencias
    ADD CONSTRAINT conferencias_rota_id_fkey FOREIGN KEY (rota_id) REFERENCES public.rotas_escolares(id) ON DELETE CASCADE;


--
-- Name: cotacoes cotacoes_prestador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes
    ADD CONSTRAINT cotacoes_prestador_id_fkey FOREIGN KEY (prestador_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: cotacoes cotacoes_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotacoes
    ADD CONSTRAINT cotacoes_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: criancas criancas_motorista_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas
    ADD CONSTRAINT criancas_motorista_id_fkey FOREIGN KEY (motorista_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: criancas criancas_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas
    ADD CONSTRAINT criancas_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: criancas_rotas criancas_rotas_crianca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_rotas
    ADD CONSTRAINT criancas_rotas_crianca_id_fkey FOREIGN KEY (crianca_id) REFERENCES public.criancas(id) ON DELETE CASCADE;


--
-- Name: criancas_rotas criancas_rotas_rota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_rotas
    ADD CONSTRAINT criancas_rotas_rota_id_fkey FOREIGN KEY (rota_id) REFERENCES public.rotas_escolares(id) ON DELETE CASCADE;


--
-- Name: criancas_viagens criancas_viagens_viagem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.criancas_viagens
    ADD CONSTRAINT criancas_viagens_viagem_id_fkey FOREIGN KEY (viagem_id) REFERENCES public.viagens(id) ON DELETE CASCADE;


--
-- Name: documentos_motorista documentos_motorista_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_motorista
    ADD CONSTRAINT documentos_motorista_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: eventos_viagem eventos_viagem_crianca_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_viagem
    ADD CONSTRAINT eventos_viagem_crianca_id_foreign FOREIGN KEY (crianca_id) REFERENCES public.criancas(id) ON DELETE CASCADE;


--
-- Name: eventos_viagem eventos_viagem_viagem_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos_viagem
    ADD CONSTRAINT eventos_viagem_viagem_id_foreign FOREIGN KEY (viagem_id) REFERENCES public.viagens(id) ON DELETE CASCADE;


--
-- Name: conferencia_criancas fk_conferencia_responsavel; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conferencia_criancas
    ADD CONSTRAINT fk_conferencia_responsavel FOREIGN KEY (responsavel_conferencia_id) REFERENCES public.usuarios(id);


--
-- Name: viagens_ativas fk_viagens_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens_ativas
    ADD CONSTRAINT fk_viagens_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: viagens_ativas fk_viagens_veiculo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens_ativas
    ADD CONSTRAINT fk_viagens_veiculo FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id);


--
-- Name: inscricoes_excursao inscricoes_excursao_pacote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricoes_excursao
    ADD CONSTRAINT inscricoes_excursao_pacote_id_fkey FOREIGN KEY (pacote_id) REFERENCES public.pacotes_excursao(id) ON DELETE CASCADE;


--
-- Name: inscricoes_excursao inscricoes_excursao_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricoes_excursao
    ADD CONSTRAINT inscricoes_excursao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: localizacoes localizacoes_viagem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localizacoes
    ADD CONSTRAINT localizacoes_viagem_id_fkey FOREIGN KEY (viagem_id) REFERENCES public.viagens(id) ON DELETE CASCADE;


--
-- Name: manutencoes_veiculo manutencoes_veiculo_veiculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manutencoes_veiculo
    ADD CONSTRAINT manutencoes_veiculo_veiculo_id_fkey FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE CASCADE;


--
-- Name: notificacoes notificacoes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: paradas_rota paradas_rota_rota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paradas_rota
    ADD CONSTRAINT paradas_rota_rota_id_fkey FOREIGN KEY (rota_id) REFERENCES public.rotas_escolares(id) ON DELETE CASCADE;


--
-- Name: pontos_parada pontos_parada_rota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontos_parada
    ADD CONSTRAINT pontos_parada_rota_id_fkey FOREIGN KEY (rota_id) REFERENCES public.rotas(id) ON DELETE CASCADE;


--
-- Name: presencas_conferencia presencas_conferencia_conferencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas_conferencia
    ADD CONSTRAINT presencas_conferencia_conferencia_id_fkey FOREIGN KEY (conferencia_id) REFERENCES public.conferencias(id) ON DELETE CASCADE;


--
-- Name: presencas_conferencia presencas_conferencia_crianca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presencas_conferencia
    ADD CONSTRAINT presencas_conferencia_crianca_id_fkey FOREIGN KEY (crianca_id) REFERENCES public.criancas(id) ON DELETE CASCADE;


--
-- Name: rastreamento_gps rastreamento_gps_viagem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rastreamento_gps
    ADD CONSTRAINT rastreamento_gps_viagem_id_fkey FOREIGN KEY (viagem_id) REFERENCES public.viagens_ativas(id) ON DELETE CASCADE;


--
-- Name: rotas_escolares rotas_escolares_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rotas_escolares
    ADD CONSTRAINT rotas_escolares_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: rotas rotas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rotas
    ADD CONSTRAINT rotas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios_status usuarios_status_atualizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_status
    ADD CONSTRAINT usuarios_status_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: usuarios_status usuarios_status_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_status
    ADD CONSTRAINT usuarios_status_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: viagens_ativas viagens_ativas_motorista_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens_ativas
    ADD CONSTRAINT viagens_ativas_motorista_id_fkey FOREIGN KEY (motorista_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: viagens_ativas viagens_ativas_rota_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viagens_ativas
    ADD CONSTRAINT viagens_ativas_rota_id_fkey FOREIGN KEY (rota_id) REFERENCES public.rotas_escolares(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict wCVe28zb287boq3qJc3mXJMO16HD3ra0ADDtmsWjVu5xuogPtshvBq3xogJwhUi


