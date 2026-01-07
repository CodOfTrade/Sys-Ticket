#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SIGE Cloud -> Postgres Harvester (v3 - INCREMENTAL)
# Modificado para usar alteradoApos nos pedidos

import os, sys, json, argparse, re, hashlib
from datetime import datetime, timedelta
import requests
import psycopg2
import psycopg2.extras
from tenacity import retry, stop_after_attempt, wait_exponential
from dotenv import load_dotenv
from pathlib import Path

# ----- .env (carregar do diretÃ³rio do script) -----
dotenv_path = Path(__file__).with_name(".env")
load_dotenv(dotenv_path=dotenv_path, override=True)
print(">> .env carregado de:", dotenv_path)

BASE_URL = os.getenv("SIGE_API_BASE", "https://api.sigecloud.com.br")
SIGE_TOKEN = os.getenv("SIGE_API_TOKEN", "")
SIGE_USER  = os.getenv("SIGE_USER", "")
SIGE_APP   = os.getenv("SIGE_APP", "")
DEFAULT_PAGESIZE = int(os.getenv("SIGE_PAGESIZE", "200"))

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "sige_bi")
DB_USER = os.getenv("DB_USER", "bi_user")
DB_PASS = os.getenv("DB_PASS", "")

# Importa o PLAN do script v1, se existir no PYTHONPATH
PLAN = []
try:
    from sige_harvest import PLAN as OLD_PLAN  # type: ignore
    PLAN = OLD_PLAN
except Exception:
    pass

# --- manter apenas GET /.../GetAll quando existir; caso nÃ£o exista GetAll, mantemos o endpoint disponÃ­vel ---
def _has_getall_for(ep, all_eps):
    try:
        base = ep["path"].split("/")[2]  # segmento apÃ³s /request/
    except Exception:
        return False
    for x in all_eps:
        try:
            if x["path"].split("/")[2] == base and "/GetAll" in x["path"]:
                return True
        except Exception:
            continue
    return False

if PLAN:
    PLAN = [ep for ep in PLAN if ("/GetAll" in ep["path"]) or (not _has_getall_for(ep, PLAN))]

def norm_table_name(tag, path):
    tag_s = re.sub(r'[^a-z0-9]+', '_', (tag or 'misc').lower()).strip('_')
    name  = re.sub(r'[^a-z0-9]+', '_', path.strip('/').lower()).strip('_')
    return f"raw.{tag_s}_{name}_raw"

def safe_index_name(base: str) -> str:
    base = re.sub(r'[^a-z0-9_]+', '_', base.lower())
    if len(base) <= 55:
        return base
    digest = hashlib.md5(base.encode()).hexdigest()[:7]
    return (base[:55] + "_" + digest)[:63]

def get_pg_conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )

def ensure_schema_and_table(conn, table):
    tblname_only = table.split('.')[-1]
    idxname = safe_index_name(f"{tblname_only}_uniq_id_expr_idx")
    with conn.cursor() as cur:
        cur.execute("CREATE SCHEMA IF NOT EXISTS raw;")
        cur.execute(f"CREATE TABLE IF NOT EXISTS {table} ("
                    "id BIGSERIAL PRIMARY KEY,"
                    "endpoint TEXT NOT NULL,"
                    "payload JSONB NOT NULL,"
                    "fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
                    ");")
        # Ã­ndice Ãºnico por ID (quando existir no payload)
        cur.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS {idxname} "
                    f"ON {table} ((payload->>'ID')) WHERE payload ? 'ID';")
    conn.commit()

def get_last_update_date(conn, table):
    """Pega a data mais recente de atualizaÃ§Ã£o dos dados na tabela"""
    try:
        with conn.cursor() as cur:
            # Tenta pegar a data mais recente do campo 'Data' no payload
            cur.execute(f"""
                SELECT MAX((payload->>'Data')::timestamp) 
                FROM {table}
                WHERE payload->>'Data' IS NOT NULL
            """)
            result = cur.fetchone()
            if result and result[0]:
                # Retorna a data - 7 dias para garantir que nÃ£o perca nada
                last_date = result[0] - timedelta(days=7)
                return last_date.strftime('%Y-%m-%dT%H:%M:%S')
    except Exception as e:
        print(f"   AVISO: Nao conseguiu pegar ultima data: {e}")
    
    # Se nÃ£o conseguir, retorna 90 dias atrÃ¡s
    fallback_date = datetime.now() - timedelta(days=90)
    return fallback_date.strftime('%Y-%m-%dT%H:%M:%S')

class ApiError(RuntimeError):
    pass

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=30), reraise=True)
def do_request(method, url, params=None, json_body=None):
    headers = {
        "Authorization-Token": SIGE_TOKEN,
        "User": SIGE_USER,
        "App": SIGE_APP
    }
    if method == "GET":
        r = requests.get(url, headers=headers, params=params, timeout=60)
    else:
        r = requests.post(url, headers=headers, json=json_body, timeout=60)

    if r.status_code in (404, 410):
        raise ApiError(f"SKIP_HTTP_{r.status_code}: {r.text[:200]}")
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
    return r.json() if r.text else {}

def extract_items(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ["Data", "data", "results", "itens", "Itens", "Items"]:
            if isinstance(data.get(key), list):
                return data.get(key)
    return [data] if data else []

def iterate_endpoint(ep):
    method = ep["method"]
    url    = ep["url"] if ep.get("url") else (BASE_URL.rstrip('/') + ep["path"])
    body_has_pages = ep.get("body_has_pages", False)
    tag = ep.get("tag") or "misc"
    path = ep["path"]
    table = norm_table_name(tag, path)

    conn = get_pg_conn()
    ensure_schema_and_table(conn, table)

    # NOVO: Para o endpoint de Pedidos, adiciona filtro de data
    use_date_filter = "/Pedidos/Pesquisar" in path
    alterado_apos = None
    
    if use_date_filter:
        alterado_apos = get_last_update_date(conn, table)
        print(f"   >> Buscando pedidos alterados apos: {alterado_apos}")

    total_inserted = 0
    skip = 0
    pagesize = DEFAULT_PAGESIZE
    
    # NOVO: Limite menor para /Pedidos/Pesquisar
    if "/Pedidos/Pesquisar" in path:
        pagesize = 100

    while True:
        qparams = {}
        body = None

        if method == "GET":
            qparams = {"pagesize": pagesize, "skip": skip}
            # NOVO: Adiciona alteradoApos para pedidos
            if use_date_filter and alterado_apos:
                qparams["alteradoApos"] = alterado_apos
        else:
            body = {"pagesize": pagesize, "skip": skip} if body_has_pages else {"pagesize": pagesize, "skip": skip}

        try:
            data = do_request(method, url, params=qparams, json_body=body)
        except ApiError as sk:
            print(f"    pulando ({path}): {sk}")
            break
        except RuntimeError as e:
            print(f"    erro: {e}")
            break

        items = extract_items(data)
        if not items:
            break

        with conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur,
                f"INSERT INTO {table} (endpoint, payload) VALUES %s ON CONFLICT DO NOTHING;",
                [(url, json.dumps(item, ensure_ascii=False)) for item in items],
                template="(%s,%s)"
            )
        conn.commit()

        total_inserted += len(items)
        
        # NOVO: Continua iterando com skip até receber página vazia
        skip += pagesize

    conn.close()
    return total_inserted

def run_all():
    if not PLAN:
        print("PLAN vazio. Importe o PLAN do sige_harvest.py v1 ou me informe os endpoints.")
        return
    grand_total = 0
    for ep in PLAN:
        try:
            print(f" Coletando: {ep.get('summary') or ep.get('operationId')}  ({ep['method']} {ep['path']})")
            inserted = iterate_endpoint(ep)
            print(f"   Inseridos: {inserted} registros\n")
            grand_total += inserted
        except Exception as e:
            print(f"    Falha em {ep['path']}: {e}\n")
    print(f"TOTAL inserido: {grand_total} registros.")

def show_plan():
    from collections import defaultdict
    by_tag = defaultdict(list)
    for ep in PLAN:
        by_tag[ep.get('tag','misc')].append(ep)
    for tag, eps in sorted(by_tag.items()):
        print(f"\n# {tag} ({len(eps)} endpoints)")
        for ep in eps:
            print(f" - {ep['method']} {ep['path']} :: {ep.get('summary') or ep.get('operationId')}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--discover", action="store_true", help="lista os endpoints descobertos")
    ap.add_argument("--run", action="store_true", help="coleta todos os endpoints e grava no schema raw.*")
    args = ap.parse_args()

    if args.discover:
        show_plan(); sys.exit(0)
    if args.run:
        run_all(); sys.exit(0)
    ap.print_help()