import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { configured, db } from "@/lib/supabase";
import { buttonClass, inputClass, Field, secondaryClass } from "./fields";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh items-center bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <a href="/" className="mb-8 flex items-center gap-4">
          <img src="/images/logo.png" alt="Pato Gordo" width="72" height="72" />
          <span className="font-display text-3xl uppercase">
            Pato Gordo
            <span className="mt-2 block font-sans text-xs font-semibold tracking-[.2em] text-primary">
              ÁREA DOS PROPRIETÁRIOS
            </span>
          </span>
        </a>
        <section className="rounded-3xl border bg-card p-6 sm:p-8">{children}</section>
        <a className="mt-6 inline-block text-sm text-muted-foreground hover:text-primary" href="/">
          ← Voltar ao site
        </a>
      </div>
    </main>
  );
}
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const cache = useQueryClient();
  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const {
      data: { subscription },
    } = db().auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
      if (!next) cache.removeQueries({ queryKey: ["admin"] });
    });
    db()
      .auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setReady(true);
      });
    return () => subscription.unsubscribe();
  }, [cache]);
  const owner = useQuery({
    queryKey: ["admin", "permission", session?.user.id],
    enabled: !!session,
    retry: false,
    refetchInterval: 30000,
    queryFn: async () => {
      const { error: authError } = await db().auth.getUser();
      if (authError) throw authError;
      const { data, error } = await db().rpc("is_owner");
      if (error) throw error;
      return data === true;
    },
  });
  if (!configured)
    return (
      <AuthFrame>
        <h1 className="text-3xl">Configuração pendente</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Configure as variáveis públicas do Supabase e aplique as migrations conforme o README.
          Nenhuma senha padrão foi criada.
        </p>
      </AuthFrame>
    );
  if (!ready || (session && owner.isPending))
    return (
      <AuthFrame>
        <p role="status">Conferindo acesso…</p>
      </AuthFrame>
    );
  if (!session) return <Login />;
  if (owner.data !== true || owner.isError)
    return (
      <AuthFrame>
        <h1 className="text-3xl">Acesso restrito</h1>
        <p className="my-5 text-muted-foreground">
          Não foi possível confirmar sua autorização como proprietário.
        </p>
        <button className={secondaryClass} onClick={() => db().auth.signOut()}>
          Sair desta conta
        </button>
      </AuthFrame>
    );
  return children;
}
export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = reset
        ? await db().auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/admin/recuperar`,
          })
        : await db().auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (reset)
        setMessage(
          "Se a conta estiver cadastrada, você receberá um link de recuperação. Abra-o neste navegador.",
        );
    } catch {
      setMessage(
        reset
          ? "Não foi possível solicitar o link. Aguarde e tente novamente."
          : "Não foi possível entrar. Confira e-mail e senha e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame>
      <p className="font-hand text-2xl text-gold">a casa é sua</p>
      <h1 className="mt-2 text-4xl">{reset ? "Recuperar senha" : "Bem-vindo de volta"}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Acesso exclusivo às contas autorizadas pelo restaurante.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <Field label="E-mail">
          <input
            className={inputClass}
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {!reset && (
          <Field label="Senha">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {message && (
          <p role="status" className="text-sm text-gold">
            {message}
          </p>
        )}
        <button className={`${buttonClass} w-full`} disabled={busy}>
          {busy ? "Aguarde…" : reset ? "Enviar link de recuperação" : "Entrar no painel"}
        </button>
        <button
          type="button"
          className="min-h-11 text-sm underline"
          onClick={() => {
            setReset(!reset);
            setMessage("");
          }}
        >
          {reset ? "Voltar ao login" : "Esqueci minha senha"}
        </button>
      </form>
    </AuthFrame>
  );
}
export function RecoverPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = db().auth.onAuthStateChange((_event, session) => setReady(!!session));
    db()
      .auth.getSession()
      .then(({ data }) => setReady(!!data.session));
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("As senhas precisam ser iguais.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await db().auth.updateUser({ password });
      if (error) throw error;
      await db().auth.signOut({ scope: "global" });
      window.location.assign("/admin");
    } catch {
      setMessage(
        "Não foi possível atualizar a senha. Solicite um novo link ou tente uma senha mais forte.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame>
      <h1 className="text-3xl">Nova senha</h1>
      {!ready ? (
        <p className="mt-5">
          Abra o link de recuperação neste navegador. Se expirou, solicite outro em{" "}
          <a className="underline" href="/admin">
            Entrar
          </a>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <Field label="Nova senha (mínimo 12 caracteres)">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Repita a senha">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {message && <p role="alert">{message}</p>}
          <button disabled={busy} className={buttonClass}>
            Salvar nova senha
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
