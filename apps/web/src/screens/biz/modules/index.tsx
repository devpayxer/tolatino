"use client";

import type { ComponentType } from "react";
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
 * opens a module by key; each module renders its own ModuleShell (PhoneFrame).
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
