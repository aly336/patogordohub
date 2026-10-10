// Monetary values are integer centavos throughout the cart.
export type Category = string;
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  ingredients: string;
  category: string;
  tag: string;
  image: string | undefined;
  available: boolean;
  published: boolean;
  featured: boolean;
}
export interface Addon {
  id: string;
  name: string;
  price: number;
}
export { money as brl } from "./catalog";
