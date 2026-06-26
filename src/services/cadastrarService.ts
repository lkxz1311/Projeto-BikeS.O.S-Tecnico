interface CadastrarResponse {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  createdAt: string;
  updatedAt: string;
}

interface CadastrarResult {
  ok: boolean;
  data?: CadastrarResponse;
  erro?: string;
}

export async function cadastrarService({ nome, email, telefone, senha }: any): Promise<CadastrarResult> {
  try {
    console.log("📤 Enviando cadastro técnico:", { nome, email, telefone });

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/usuarios/cadastro/tecnico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, telefone, senha }),
    });

    const data = await response.json();

    console.log("✅ Status:", response.status);
    console.log("📦 Resposta:", data);

    if (!response.ok) {
      return { ok: false, erro: data.mensagem ?? "Erro ao cadastrar técnico" };
    }

    return { ok: true, data };
  } catch (error: any) {
    console.log("⚠️ Erro de conexão:", error.message);
    return { ok: false, erro: "Falha na conexão com o servidor" };
  }
}