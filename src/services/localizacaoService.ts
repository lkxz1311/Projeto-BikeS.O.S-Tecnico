const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface EnviarLocalizacaoParams {
  pedidoId: string;
  tecnicoId?: string;
  latitude: number;
  longitude: number;
}

export async function enviarLocalizacaoTecnico({
  pedidoId,
  tecnicoId,
  latitude,
  longitude,
}: EnviarLocalizacaoParams) {
  try {
    if (!API_URL) {
      throw new Error("EXPO_PUBLIC_API_URL não configurada no .env");
    }

    const response = await fetch(`${API_URL}/pedidos/${pedidoId}/localizacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tecnicoId,
        latitude,
        longitude,
      }),
    });

    if (!response.ok) {
      const erro = await response.json().catch(() => null);
      throw new Error(
        `Erro na API (${response.status}): ${erro?.mensagem ?? "Falha ao atualizar localização."}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao enviar localização do técnico:", error);
    throw error;
  }
}