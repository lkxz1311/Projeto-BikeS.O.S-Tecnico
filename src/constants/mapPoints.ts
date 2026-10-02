import type { Region } from "react-native-maps";

export interface PointOfInterest {
  id: string;
  name: string;
  category: "tecnico" | "cliente" | "parceiro";
  description: string;
  latitude: number;
  longitude: number;
  phone?: string;
  address: string;
  hours?: string;
}

export const JARDIM_REGION: Region = {
  latitude: -21.4803,
  longitude: -56.1381,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  tecnico: { label: "Técnico", color: "#22C55E" },
  cliente: { label: "Cliente", color: "#1565C0" },
  parceiro: { label: "Parceiro", color: "#F59E0B" },
};

export const POINTS_OF_INTEREST: PointOfInterest[] = [
  {
    id: "1",
    name: "Técnico Jardim Centro",
    category: "tecnico",
    description: "Atendimento técnico especializado no centro da cidade.",
    latitude: -21.4803,
    longitude: -56.1381,
    phone: "(67) 99999-0001",
    address: "Centro - Jardim, MS",
    hours: "08:00 - 18:00",
  }
  
];

export const estiloSemEmpresas = [
  {
    featureType: "poi.business",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.medical",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.school",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.sports_complex",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.government",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.attraction",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.place_of_worship",
    elementType: "all",
    stylers: [{ visibility: "off" }],
  },
];