export interface ECSetItem {
  ec_set_id: number;
  set_name: string;
  set_description: string;
}

export interface RecommendQueryParams {
  ec_set_id: number;
  category: string;
  cans: number;
  kinds: number;
  ng_id?: number[];
}

export interface RecommendResponseItem {
  ec_brand_id: number;
  name: string;
  description: string;
  price: number;
  count: number;
  category: string; // 追加
  ec_set_id: number; // 追加
  picture?: string; // OptionalとしてBase64エンコードされた画像データを追加
}

export interface NationalCraftOption {
  national: number;
  craft: number;
}

export const nationalCraftOptions: Record<number, NationalCraftOption[]> = {
  12: [
    { national: 0, craft: 12 },
    { national: 6, craft: 6 },
    { national: 12, craft: 0 },
  ],
  24: [
    { national: 24, craft: 0 },
    { national: 18, craft: 6 },
    { national: 12, craft: 12 },
    { national: 6, craft: 18 },
    { national: 0, craft: 24 },
  ],
};

export interface PurchaseItem {
  ec_brand_id: number;
  category: string;
  picture?: string; // OptionalとしてBase64エンコードされた画像データを追加
  name: string;
  price: number;
  count: number;
  ec_set_id: number;
}

export interface PurchaseSubSetItem {
  cans: number;
  set_name: string;
  details: PurchaseItem[];
}

export interface PurchaseSetItem {
  setDetails: {
    cans: number;
    set_num: number;
  };
  national_set: PurchaseSubSetItem;
  craft_set: PurchaseSubSetItem;
}

export interface User {
  user_id: number;
  user_name: string;
  user_profile: string;
  user_picture: string;
}

export interface Brand {
  brand_id: number;
  brand_name: string;
}

export interface Item {
  item_id: number;
  item_name: string;
}

export interface Preference {
  user_id: number;
  item_id: number;
  score: number;
  item: Item;
}

export interface NgList {
  ng_id: number;
  ng_name: string;
}

export interface EcBrandItem {
  ec_brand_id: number;
  category: string;
  name: string;
  description: string;
  price: number;
}

export interface DecodedToken {
  sub: string;
}

export interface Purchaselog {
  purchase_id: number;
  date_time: string; // 日時はISO形式の文字列として扱う
  total_amount: number;
  total_cans: number;
  survey_completion: boolean;
  details: PurchaseItem[];
}

export interface PurchaselogPage {
  page: number;
  total_page: number;
  purchaselog: Purchaselog[];
}
