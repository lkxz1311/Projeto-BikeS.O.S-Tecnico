interface LoginResponse {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  createdAt: string;
  updatedAt: string;
}

interface LoginResult {
  ok: boolean;
  data?: LoginResponse;
  erro?: string;
}

export async function loginService({ email, senha }: { email: string; senha: string }): Promise<LoginResult> {
  try {
    console.log("📤 Enviando login técnico:", { email });

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();

    console.log("✅ Status:", response.status);
    console.log("📦 Resposta:", data);

    if (!response.ok) {
      return { ok: false, erro: data.mensagem ?? "Credenciais inválidas" };
    }

    if (data.tipo !== "tecnico") {
      return { ok: false, erro: "Acesso permitido apenas para técnicos!" };
    }

    return { ok: true, data };
  } catch (error: any) {
    console.log("⚠️ Erro de conexão:", error.message);
    return { ok: false, erro: "Falha na conexão com o servidor" };
  }
}