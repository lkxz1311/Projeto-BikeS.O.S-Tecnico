export type PedidoStatus =
  | "Aguardando técnico"
  | "Técnico aceitou"
  | "Técnico a caminho"
  | "Em atendimento"
  | "Finalizado"
  | "Rejeitado";

export type Pedido = {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  problema: string;
  bike: string;
  localizacao: string;
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
    localizacao: "Centro",
    pagamento: "Pix",
    status: "Aguardando técnico",
  },
  {
    id: "BS2035",
    clienteNome: "Mariana Silva",
    clienteTelefone: "(67) 98888-7777",
    problema: "Freio desregulado",
    bike: "Speed",
    localizacao: "Jardim América",
    pagamento: "Dinheiro",
    status: "Finalizado",
    tecnicoNome: "Oficina Verde Bike",
  },
];

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