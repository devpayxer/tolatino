"use client";

import type { ComponentType } from "react";
import {
  UtensilsCrossed,
  Wrench,
  Package,
  Ticket,
  KeyRound,
  Megaphone,
  Users,
  UserCog,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { FoodModule } from "./FoodModule";
import { ServicesModule } from "./ServicesModule";
import { ProductsModule } from "./ProductsModule";
import { EventsModule } from "./EventsModule";
import { RentalModule } from "./RentalModule";
import { UpdatesModule } from "./UpdatesModule";
import { CustomersModule } from "./CustomersModule";
import { StaffModule } from "./StaffModule";
import { BillingModule } from "./BillingModule";

/**
 * Registry mapping a dashboard module key → its screen. The BizDashboard grid
 * + the BizMenu drawer open a module by key; each renders its own ModuleShell.
 */
export const MODULE_SCREENS: Record<string, ComponentType<{ onBack: () => void }>> = {
  food: FoodModule,
  services: ServicesModule,
  products: ProductsModule,
  events: EventsModule,
  rental: RentalModule,
  updates: UpdatesModule,
  customers: CustomersModule,
  staff: StaffModule,
  billing: BillingModule,
};

/** Shared module metadata (icon + bilingual label) — single source for the
 * dashboard grid and the navigation drawer. Order = display order. */
export const MODULE_META: { key: string; icon: LucideIcon; es: string; en: string }[] = [
  { key: "food", icon: UtensilsCrossed, es: "Comida", en: "Food" },
  { key: "services", icon: Wrench, es: "Servicios", en: "Services" },
  { key: "products", icon: Package, es: "Productos", en: "Products" },
  { key: "events", icon: Ticket, es: "Eventos", en: "Events" },
  { key: "rental", icon: KeyRound, es: "Renta", en: "Rental" },
  { key: "updates", icon: Megaphone, es: "Novedades", en: "Updates" },
  { key: "customers", icon: Users, es: "Clientes", en: "Customers" },
  { key: "staff", icon: UserCog, es: "Equipo", en: "Staff" },
  { key: "billing", icon: CreditCard, es: "Facturación", en: "Billing" },
];
