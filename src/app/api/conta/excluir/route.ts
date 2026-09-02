import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { store } from "@/lib/db";
import { OWNER_COOKIE } from "@/lib/owner";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/**
 * Exclusão de conta (LGPD, art. 18, VI).
 *
 * "Excluir" aqui significa excluir: as linhas saem do banco e os arquivos
 * saem do Storage. Não existe conta desativada guardada num canto — se
 * guardássemos, a promessa da tela seria mentira.
 *
 * A ordem importa: primeiro os dados (enquanto ainda sabemos quem é o dono),
 * depois o usuário do Auth, e por fim a sessão e o cookie do dispositivo.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Você precisa estar na sua conta para excluí-la." }, { status: 401 });
  }

  // Confirmação explícita: a exclusão nunca pode acontecer por engano.
  const body = await request.json().catch(() => ({}));
  if (body?.confirmacao !== "EXCLUIR") {
    return NextResponse.json({ error: "Confirmação não confere." }, { status: 400 });
  }

  const resultado = await store().deleteOwner(user.id);

  // O usuário do Auth só existe quando há Supabase configurado; sem service
  // role não há como removê-lo, e é melhor dizer isso do que fingir que sumiu.
  let contaRemovida = false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRole) {
    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json(
        { error: "Apaguei seus dados, mas não consegui remover o login. Fale com a gente." },
        { status: 500 },
      );
    }
    contaRemovida = true;
  }

  const supabase = await supabaseServer();
  await supabase?.auth.signOut();

  const response = NextResponse.json({
    ok: true,
    conta_removida: contaRemovida,
    apagadas: resultado.apagadas,
    arquivos: resultado.arquivos,
  });
  // O id anônimo do dispositivo também vai embora: senão a próxima visita
  // herdaria um dono que a pessoa acabou de pedir para apagar.
  response.cookies.delete(OWNER_COOKIE);
  return response;
}
