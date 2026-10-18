export type PedidoStatus =
  | "Aguardando técnico"
  | "Técnico aceitou"
  | "Técnico a caminho"
  | "Em atendimento"
  | "Finalizado"
  | "Rejeitado";

export interface EnderecoEstruturado {
  rua: string;
  cidade: string;
  estado: string;
}

export interface CoordenadasGPS {
  latitude: number;
  longitude: number;
}

export type Pedido = {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  problema: string;
  bike: string;
  localizacao: string;
  enderecoCompleto?: EnderecoEstruturado;
  coordenadas?: CoordenadasGPS | null;
  pagamento: string;
  status: PedidoStatus;
  tecnicoNome?: string;
};

export const pedidos: Pedido[] = [
  {
    id: "BS1024",
    clienteNome: "Lucas Carvalho",
    clienteTelefone: "(67) 99999-9999",
    problema: "Pneu furado",
    bike: "Mountain Bike",
    localizacao: "Av. Afonso Pena, Campo Grande - MS",
    enderecoCompleto: {
      rua: "Av. Afonso Pena",
      cidade: "Campo Grande",
      estado: "MS",
    },
    coordenadas: {
      latitude: -20.4697,
      longitude: -54.6201,
    },
    pagamento: "Pix",
    status: "Aguardando técnico",
  },
  {
    id: "BS2035",
    clienteNome: "Mariana Silva",
    clienteTelefone: "(67) 98888-7777",
    problema: "Freio desregulado",
    bike: "Speed",
    localizacao: "Rua 14 de Julho, Campo Grande - MS",
    enderecoCompleto: {
      rua: "Rua 14 de Julho",
      cidade: "Campo Grande",
      estado: "MS",
    },
    coordenadas: {
      latitude: -20.4633,
      longitude: -54.6144,
    },
    pagamento: "Dinheiro",
    status: "Finalizado",
    tecnicoNome: "Oficina Verde Bike",
  },
];

/**
 * Função utilitária para exibir o endereço higienizado no app do técnico.
 * Prioriza a rua estruturada e fallback para a localização formatada.
 */
export function formatarEnderecoTecnico(pedido: Pedido): string {
  if (pedido.enderecoCompleto?.rua) {
    const { rua, cidade, estado } = pedido.enderecoCompleto;
    return `${rua} - ${cidade}/${estado}`;
  }
  return pedido.localizacao || "Endereço não informado";
}

export function aceitarPedido(id: string) {
  const pedido = pedidos.find((item) => item.id === id);

  if (pedido) {
    pedido.status = "Técnico aceitou";
    pedido.tecnicoNome = "Oficina Verde Bike";
  }
}

export function rejeitarPedido(id: string) {
  const pedido = pedidos.find((item) => item.id === id);

  if (pedido) {
    pedido.status = "Rejeitado";
  }
}

export function atualizarStatusPedido(id: string) {
  const pedido = pedidos.find((item) => item.id === id);

  if (!pedido) return;

  if (pedido.status === "Técnico aceitou") {
    pedido.status = "Técnico a caminho";
  } else if (pedido.status === "Técnico a caminho") {
    pedido.status = "Em atendimento";
  } else if (pedido.status === "Em atendimento") {
    pedido.status = "Finalizado";
  }
}