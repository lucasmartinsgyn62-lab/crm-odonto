// Anexos do prontuário (bucket `prontuarios`).
// O bucket é PRIVADO e a policy exige que o caminho comece pelo tenant_id
// (storage.foldername(name)[1] = get_my_tenant()). Por isso:
//  - grave sempre { path } no banco, NUNCA a URL assinada (ela expira);
//  - a URL é assinada na hora de exibir, com cache em memória.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const BUCKET = 'prontuarios';
const VALIDADE = 3600;                       // 1h
const cache = new Map();                     // path -> { url, exp }

export async function enviarAnexo(file, tenantId) {
  const path = `${tenantId || 'geral'}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) return { error: error.message };
  return { anexo: { name: file.name, path, tipo: file.type, dt: new Date().toISOString() } };
}

// formato antigo guardava a imagem em base64 no campo `data`; nos exames o
// mesmo nome é a DATA do exame — por isso a checagem de "data:"
const base64 = item => (typeof item?.data === 'string' && item.data.startsWith('data:') ? item.data : null);

export async function urlAnexo(item) {
  if (!item) return null;
  if (base64(item)) return item.data;
  if (!item.path) return item.url || null;               // arquivo estático (/public) ou URL externa
  const hit = cache.get(item.path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(item.path, VALIDADE);
  if (!data?.signedUrl) return item.url || null;         // fallback: URL antiga, se houver
  cache.set(item.path, { url: data.signedUrl, exp: Date.now() + (VALIDADE - 300) * 1000 });
  return data.signedUrl;
}

export function useAnexoUrl(item) {
  const [url, setUrl] = useState(base64(item) || (!item?.path ? item?.url : null) || null);
  useEffect(() => {
    let vivo = true;
    urlAnexo(item).then(u => { if (vivo) setUrl(u); });
    return () => { vivo = false; };
  }, [item?.path, item?.url, item?.data]);
  return url;
}

export function AnexoImg({ item, alt = '', ...props }) {
  const url = useAnexoUrl(item);
  if (!url) return <div {...props} style={{ ...props.style, background: '#EAF7FF' }} />;
  return <img src={url} alt={alt} {...props} />;
}
